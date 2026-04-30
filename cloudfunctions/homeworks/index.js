const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data, id } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 获取用户
  const userRes = await db.collection('users').where({ openid }).get();
  if (userRes.data.length === 0) {
    return { code: 401, message: '未登录', data: null };
  }
  const user = userRes.data[0];

  try {
    switch (action) {
      case 'list':
        return await listHomeworks(user._id, data);
      case 'get':
        return await getHomework(user._id, id);
      case 'create':
        return await createHomework(user._id, data);
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

  // 获取关联的任务
  const tasksRes = await db.collection('task_items')
    .where({ batch_id: id })
    .orderBy('sort_order', 'asc')
    .orderBy('_id', 'asc')
    .get();

  const tasks = tasksRes.data;

  // 获取每个任务的提交记录
  for (let i = 0; i < tasks.length; i++) {
    const submissionRes = await db.collection('task_submissions')
      .where({ task_id: tasks[i]._id })
      .orderBy('submitted_at', 'desc')
      .limit(1)
      .get();

    if (submissionRes.data.length > 0) {
      tasks[i].submission = submissionRes.data[0];

      // 获取批改结果
      const checkRes = await db.collection('check_results')
        .where({ submission_id: tasks[i].submission._id })
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

  // 创建作业批次
  const batchData = {
    user_id: userId,
    child_id: data.child_id,
    subject: data.subject || null,
    input_source: data.input_source,
    raw_text: data.raw_text || null,
    batch_date: data.batch_date,
    status: 1,
    created_at: now,
    updated_at: now,
  };

  const batchRes = await db.collection('homework_batches').add({ data: batchData });
  const batchId = batchRes._id;

  // 解析原始文本，拆分任务
  const raw = (data.raw_text || '').trim();
  let segments = raw
    ? raw.split(/[\n\r]+|[。；;]/).filter(s => s.trim())
    : [];

  if (segments.length === 0) {
    segments = ['完成老师布置的作业'];
  }

  // 创建任务
  const tasks = [];
  for (let i = 0; i < segments.length; i++) {
    const title = segments[i].trim().substring(0, 255);
    const taskData = {
      batch_id: batchId,
      child_id: data.child_id,
      title,
      task_type: 'other',
      subject: data.subject || null,
      expected_minutes: 10,
      check_mode: 1,
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
  // 先删除关联的任务
  await db.collection('task_items').where({ batch_id: id }).remove();

  // 删除作业批次
  const res = await db.collection('homework_batches')
    .where({ _id: id, user_id: userId })
    .remove();

  if (res.stats.removed === 0) {
    return { code: 404, message: '作业不存在', data: null };
  }

  return { code: 0, message: 'deleted', data: null };
}
