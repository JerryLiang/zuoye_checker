const cloud = require('wx-server-sdk');
const https = require('https');
let sharp = null;
try {
  sharp = require('sharp');
} catch (_err) {
  sharp = null;
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const HOMEWORK_AI_BASE_URL = process.env.HOMEWORK_AI_BASE_URL || 'https://api.deepseek.com';
const HOMEWORK_AI_MODEL = process.env.HOMEWORK_AI_MODEL || 'deepseek-v4-flash';
const HOMEWORK_AI_API_KEY = process.env.HOMEWORK_AI_API_KEY || process.env.DASHSCOPE_API_KEY || '';

exports.main = async (event, context) => {
  const { action, data, id } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    await ensureCollections(['users', 'children', 'homework_batches', 'task_items', 'task_submissions', 'check_results', 'file_assets']);
    const user = await getOrCreateUser(openid);

    switch (action) {
      case 'list':
        return await listHomeworks(user._id, data);
      case 'get':
        return await getHomework(user._id, id);
      case 'create':
        return await createHomework(user._id, data);
      case 'recognize_image':
        return await recognizeHomeworkImage(user._id, data);
      case 'update':
        return await updateHomework(user._id, id, data);
      case 'delete':
        return await deleteHomework(user._id, id);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function ensureCollections(names) {
  for (let i = 0; i < names.length; i++) {
    await ensureCollection(names[i]);
  }
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (err) {
    const msg = err && err.message ? err.message : '';
    if (!/exist|already|duplicate/i.test(msg)) {
      throw err;
    }
  }
}

async function getOrCreateUser(openid) {
  const userRes = await db.collection('users').where({ openid }).get();
  if (userRes.data.length > 0) {
    return userRes.data[0];
  }

  const now = db.serverDate();
  const res = await db.collection('users').add({
    data: {
      openid,
      nickname: '家长用户',
      avatar_url: null,
      status: 1,
      api_token: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    _id: res._id,
    openid,
    nickname: '家长用户',
    avatar_url: null,
    status: 1,
    api_token: null,
  };
}

async function listHomeworks(userId, data = {}) {
  const where = { user_id: userId };
  if (data.child_id) {
    where.child_id = data.child_id;
  }

  const res = await db.collection('homework_batches')
    .where(where)
    .orderBy('batch_date', 'desc')
    .orderBy('_id', 'desc')
    .get();

  return { code: 0, message: 'ok', data: res.data };
}

async function getHomework(userId, id) {
  const res = await db.collection('homework_batches')
    .where({ _id: id, user_id: userId })
    .get();

  if (res.data.length === 0) {
    return { code: 404, message: '作业不存在', data: null };
  }

  const batch = res.data[0];

  // 获取关联的任务。先校验批次归属，再按 batch_id 查询，避免越权读取。
  const tasksRes = await db.collection('task_items')
    .where({ batch_id: id })
    .orderBy('sort_order', 'asc')
    .orderBy('_id', 'asc')
    .get();

  const tasks = tasksRes.data;

  // 获取每个任务的提交记录
  for (let i = 0; i < tasks.length; i++) {
    const submissionRes = await db.collection('task_submissions')
      .where({ task_id: tasks[i]._id, child_id: batch.child_id })
      .orderBy('submitted_at', 'desc')
      .limit(1)
      .get();

    if (submissionRes.data.length > 0) {
      tasks[i].submission = submissionRes.data[0];

      // 获取批改结果
      const checkRes = await db.collection('check_results')
        .where({ submission_id: tasks[i].submission._id, task_id: tasks[i]._id })
        .limit(1)
        .get();

      if (checkRes.data.length > 0) {
        tasks[i].submission.check_result = checkRes.data[0];
      }
    }
  }

  batch.tasks = tasks;

  return { code: 0, message: 'ok', data: batch };
}

async function createHomework(userId, data) {
  const now = db.serverDate();

  if (!data || !data.child_id || !data.batch_date) {
    return { code: 400, message: '缺少必要参数', data: null };
  }

  // 验证学生归属，防止给别人的 child_id 创建作业。
  const childRes = await db.collection('children')
    .where({ _id: data.child_id, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  // 创建作业批次
  const batchData = {
    user_id: userId,
    child_id: data.child_id,
    subject: data.subject || null,
    input_source: data.input_source,
    raw_text: data.raw_text || null,
    file_asset_id: data.file_asset_id || null,
    batch_date: data.batch_date,
    status: 1,
    created_at: now,
    updated_at: now,
  };

  const batchRes = await db.collection('homework_batches').add({ data: batchData });
  const batchId = batchRes._id;

  // 解析作业条目。新版前端会传 task_items，老版本仍兼容 raw_text 按行拆分。
  const items = normalizeTaskItems(data);

  // 数学自动批改答案：每行对应一个任务，仅数学科目启用。
  const answerSegments = data.subject === '数学' && data.check_answers
    ? String(data.check_answers).split(/[\n\r]+/).map(s => s.trim())
    : [];

  // 创建任务
  const tasks = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.text.substring(0, 255);
    const subject = item.subject || data.subject || null;
    const expectedAnswer = subject === '数学' ? (answerSegments[i] || null) : null;
    const taskData = {
      batch_id: batchId,
      user_id: userId,
      child_id: data.child_id,
      title,
      task_type: subject === '数学' && expectedAnswer ? 'math' : 'other',
      subject,
      expected_answer: expectedAnswer,
      expected_minutes: 10,
      check_mode: expectedAnswer ? 2 : 1,
      pass_score: 60,
      status: 1,
      sort_order: i,
      created_at: now,
      updated_at: now,
    };

    const taskRes = await db.collection('task_items').add({ data: taskData });
    tasks.push({ _id: taskRes._id, ...taskData });
  }

  return {
    code: 0,
    message: 'created',
    data: { _id: batchId, ...batchData, tasks },
  };
}

function normalizeTaskItems(data = {}) {
  const allowedSubjects = ['语文', '数学', '英语', '其他'];
  if (Array.isArray(data.task_items) && data.task_items.length > 0) {
    const items = data.task_items
      .map(item => ({
        subject: allowedSubjects.includes(item.subject) ? item.subject : (data.subject || '其他'),
        text: String(item.text || '').trim(),
      }))
      .filter(item => item.text);
    if (items.length > 0) {
      return items;
    }
  }

  const raw = String(data.raw_text || '').trim();
  const segments = raw
    ? raw.split(/[\n\r]+|[。；;]/).map(s => s.trim()).filter(Boolean)
    : [];

  if (segments.length === 0) {
    return [{ subject: data.subject || '其他', text: '完成老师布置的作业' }];
  }

  return segments.map(text => ({ subject: data.subject || '其他', text }));
}

async function recognizeHomeworkImage(userId, data = {}) {
  const debugLogs = [];
  if (!data.file_asset_id) {
    return { code: 400, message: '缺少file_asset_id', data: null };
  }

  const assetRes = await db.collection('file_assets')
    .where({ _id: data.file_asset_id, user_id: userId })
    .limit(1)
    .get();

  if (assetRes.data.length === 0) {
    return { code: 404, message: '文件不存在', data: null };
  }

  const asset = assetRes.data[0];
  if (!HOMEWORK_AI_MODEL || !HOMEWORK_AI_API_KEY) {
    return buildRecognitionFallback('ai_not_configured', null, debugLogs);
  }

  try {
    const downloadRes = await cloud.downloadFile({ fileID: asset.fileID });
    const imageBuffer = downloadRes.fileContent;
    const mimeType = getImageMimeType(asset.file_ext);
    const recognition = await callVisionModel({ imageBuffer, mimeType, debugLogs });

    return {
      code: 0,
      message: 'recognized',
      data: normalizeRecognitionResult(recognition),
    };
  } catch (err) {
    logAiDebug('error', {
      message: err && err.message,
      statusCode: err && err.statusCode,
      responseBody: err && err.responseBody,
      baseUrl: HOMEWORK_AI_BASE_URL,
      model: HOMEWORK_AI_MODEL,
    }, debugLogs);
    return buildRecognitionFallback('ai_recognition_failed', err && err.message, debugLogs);
  }
}

function buildRecognitionFallback(reason, detail, debugLogs = []) {
  const message = reason === 'ai_not_configured'
    ? 'AI模型未配置'
    : `AI识别失败${detail ? `：${String(detail).slice(0, 80)}` : '，请稍后重试'}`;
  return {
    code: 0,
    message: reason,
    data: {
      subject: null,
      batch_date: null,
      raw_text: '',
      recognized_items: [],
      confidence: 0,
      provider_message: message,
      debug_logs: debugLogs,
    },
  };
}

function getImageMimeType(fileExt = '') {
  const ext = String(fileExt).toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

async function callVisionModel({ imageBuffer, mimeType, debugLogs = [] }) {
  const baseUrl = HOMEWORK_AI_BASE_URL.replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  let modelImageBuffer = imageBuffer;
  let modelMimeType = mimeType;
  const configuredFormat = String(process.env.HOMEWORK_AI_IMAGE_FORMAT || '').toLowerCase();
  const shouldUseTextBase64 = configuredFormat === 'text_base64'
    || (!configuredFormat && /api\.deepseek\.com/i.test(baseUrl || ''));

  if (shouldUseTextBase64) {
    const compressed = await compressImageForTextPayload({ imageBuffer, mimeType, debugLogs });
    modelImageBuffer = compressed.imageBuffer;
    modelMimeType = compressed.mimeType;
  }

  const imageBase64 = Buffer.from(modelImageBuffer).toString('base64');
  const promptText = '请从图片中识别作业信息，返回 JSON：{"subject":"语文|数学|英语|其他","batch_date":"YYYY-MM-DD或空字符串","raw_text":"每行一条作业内容","recognized_items":[{"subject":"语文|数学|英语|其他","text":"一条作业内容"}],"confidence":0到1}。如果一张图片里有多个科目，请在 recognized_items 里分别列出每条作业的科目和内容；如果日期无法判断，batch_date 为空字符串；如果科目无法判断，subject 为其他。';
  const imageInput = buildImageInput({ baseUrl, imageBase64, mimeType: modelMimeType, promptText });
  const startedAt = Date.now();

  const payload = {
    model: HOMEWORK_AI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '你是作业图片识别助手。只输出 JSON，不要输出 Markdown。识别小学生作业图片中的科目、日期和作业内容。',
      },
      {
        role: 'user',
        content: imageInput.content,
      },
    ],
    temperature: 0.1,
  };

  logAiDebug('request', {
    endpoint,
    model: HOMEWORK_AI_MODEL,
    mimeType: modelMimeType,
    originalImageBytes: imageBuffer.length,
    imageBytes: modelImageBuffer.length,
    base64Length: imageBase64.length,
    imageCompressed: modelImageBuffer.length !== imageBuffer.length,
    imageFormat: imageInput.format,
    messageCount: payload.messages.length,
    userContentType: Array.isArray(imageInput.content) ? 'array' : typeof imageInput.content,
    responseFormat: payload.response_format,
  }, debugLogs);

  const res = await postJson(endpoint, payload, HOMEWORK_AI_API_KEY, debugLogs);
  const message = res && res.choices && res.choices[0] ? res.choices[0].message : null;
  const content = extractMessageContent(message);
  logAiDebug('message', {
    durationMs: Date.now() - startedAt,
    responseId: res && res.id,
    finishReason: res && res.choices && res.choices[0] ? res.choices[0].finish_reason : undefined,
    usage: res && res.usage,
    contentPreview: typeof content === 'string' ? content.slice(0, 3000) : content,
  }, debugLogs);
  const parsed = parseModelJson(content);
  logAiDebug('parsed', parsed, debugLogs);
  return parsed;
}

async function compressImageForTextPayload({ imageBuffer, mimeType, debugLogs }) {
  const maxBytes = Number(process.env.HOMEWORK_AI_TEXT_IMAGE_MAX_BYTES || 512 * 1024);
  if (imageBuffer.length <= maxBytes) {
    logAiDebug('image_prepare', {
      skipped: true,
      reason: 'already_under_limit',
      originalBytes: imageBuffer.length,
      maxBytes,
      sharpAvailable: Boolean(sharp),
    }, debugLogs);
    return { imageBuffer, mimeType };
  }

  if (!sharp) {
    const err = new Error(`图片过大：${imageBuffer.length} bytes，当前 DeepSeek 文本接口需要压缩到 ${maxBytes} bytes 以下，但 sharp 未安装`);
    err.code = 'image_too_large_without_sharp';
    throw err;
  }

  const attempts = [
    { width: 1600, quality: 70 },
    { width: 1400, quality: 65 },
    { width: 1200, quality: 60 },
    { width: 1000, quality: 55 },
    { width: 900, quality: 50 },
    { width: 800, quality: 45 },
  ];

  let bestBuffer = imageBuffer;
  for (const attempt of attempts) {
    const output = await sharp(imageBuffer, { failOn: 'none' })
      .rotate()
      .resize({ width: attempt.width, height: attempt.width, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: attempt.quality, mozjpeg: true })
      .toBuffer();

    bestBuffer = output;
    logAiDebug('image_prepare', {
      originalMimeType: mimeType,
      outputMimeType: 'image/jpeg',
      originalBytes: imageBuffer.length,
      outputBytes: output.length,
      maxBytes,
      width: attempt.width,
      quality: attempt.quality,
    }, debugLogs);

    if (output.length <= maxBytes) {
      return { imageBuffer: output, mimeType: 'image/jpeg' };
    }
  }

  return { imageBuffer: bestBuffer, mimeType: 'image/jpeg' };
}

function buildImageInput({ baseUrl, imageBase64, mimeType, promptText }) {
  const configuredFormat = String(process.env.HOMEWORK_AI_IMAGE_FORMAT || '').toLowerCase();
  const shouldUseTextBase64 = configuredFormat === 'text_base64'
    || (!configuredFormat && /api\.deepseek\.com/i.test(baseUrl || ''));

  if (shouldUseTextBase64) {
    return {
      format: 'text_base64',
      content: `${promptText}\n\n图片 MIME 类型：${mimeType}\n图片 base64 数据：data:${mimeType};base64,${imageBase64}`,
    };
  }

  if (configuredFormat === 'mcp_image') {
    return {
      format: 'mcp_image',
      content: [
        { type: 'text', text: promptText },
        {
          type: 'image',
          data: imageBase64,
          mimeType,
        },
      ],
    };
  }

  return {
    format: 'openai_image_url',
    content: [
      { type: 'text', text: promptText },
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
    ],
  };
}

function logAiDebug(stage, data, debugLogs) {
  const entry = { stage, data };
  if (Array.isArray(debugLogs)) {
    debugLogs.push(entry);
  }
  try {
    console.error(`[homeworks.ai.${stage}] ${JSON.stringify(data)}`);
  } catch (_err) {
    console.error(`[homeworks.ai.${stage}]`, data);
  }
}

function extractMessageContent(message) {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        if (part && typeof part.content === 'string') return part.content;
        return '';
      })
      .join('\n');
  }
  if (typeof message.reasoning_content === 'string' && !message.content) {
    return message.reasoning_content;
  }
  return '';
}

function postJson(url, payload, apiKey, debugLogs) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: `${parsed.pathname}${parsed.search}`,
      method: 'POST',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${apiKey}`,
      },
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        logAiDebug('http_response', {
          statusCode: res.statusCode,
          bodyLength: text.length,
          bodyPreview: text.slice(0, 3000),
        }, debugLogs);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`model api status ${res.statusCode}: ${text.slice(0, 500)}`);
          error.statusCode = res.statusCode;
          error.responseBody = text.slice(0, 3000);
          reject(error);
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('model api timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseModelJson(content) {
  if (!content) throw new Error('model returned empty content');
  if (typeof content === 'object') return content;
  const text = String(content).trim();
  try {
    return JSON.parse(text);
  } catch (_err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('model returned non-json content');
    return JSON.parse(match[0]);
  }
}

function normalizeRecognitionResult(result = {}) {
  const allowedSubjects = ['语文', '数学', '英语', '其他'];
  const subject = allowedSubjects.includes(result.subject) ? result.subject : '其他';
  const batchDate = /^\d{4}-\d{2}-\d{2}$/.test(result.batch_date || '') ? result.batch_date : null;
  const rawLines = String(result.raw_text || '')
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(Boolean);
  const rawText = rawLines.join('\n');
  const recognizedItems = normalizeRecognitionItems(result.recognized_items, rawLines, subject);

  return {
    subject,
    batch_date: batchDate,
    raw_text: rawText,
    recognized_items: recognizedItems,
    confidence: Number(result.confidence || 0),
    provider_message: result.provider_message || (recognizedItems.length === 0 ? '未识别到作业内容，请换一张更清晰的图片' : undefined),
  };
}

function normalizeRecognitionItems(items, rawLines, fallbackSubject) {
  const allowedSubjects = ['语文', '数学', '英语', '其他'];
  if (Array.isArray(items) && items.length > 0) {
    const normalized = items
      .map(item => ({
        subject: allowedSubjects.includes(item.subject) ? item.subject : fallbackSubject,
        text: String(item.text || '').trim(),
      }))
      .filter(item => item.text);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return rawLines.map(text => ({ subject: fallbackSubject, text }));
}

async function updateHomework(userId, id, data) {
  const updateData = {};
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.raw_text !== undefined) updateData.raw_text = data.raw_text;
  if (data.status !== undefined) updateData.status = data.status;
  updateData.updated_at = db.serverDate();

  const res = await db.collection('homework_batches')
    .where({ _id: id, user_id: userId })
    .update({ data: updateData });

  if (res.stats.updated === 0) {
    return { code: 404, message: '作业不存在', data: null };
  }

  return { code: 0, message: 'updated', data: { _id: id, ...data } };
}

async function deleteHomework(userId, id) {
  const batchRes = await db.collection('homework_batches')
    .where({ _id: id, user_id: userId })
    .get();

  if (batchRes.data.length === 0) {
    return { code: 404, message: '作业不存在', data: null };
  }

  const batch = batchRes.data[0];
  const tasksRes = await db.collection('task_items')
    .where({ batch_id: id, child_id: batch.child_id })
    .get();
  const taskIds = tasksRes.data.map(task => task._id);

  if (taskIds.length > 0) {
    await db.collection('check_results').where({ task_id: _.in(taskIds) }).remove();
    await db.collection('task_submissions').where({ task_id: _.in(taskIds), child_id: batch.child_id }).remove();
    await db.collection('task_items').where({ batch_id: id, child_id: batch.child_id }).remove();
  }

  await db.collection('homework_batches').doc(batch._id).remove();

  return { code: 0, message: 'deleted', data: null };
}
