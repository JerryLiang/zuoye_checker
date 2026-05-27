const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const ALLOWED_BIZ_TYPES = ['homework_input', 'task_submission'];
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf', 'mp3', 'm4a', 'aac', 'wav'];

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    await ensureCollections(['users', 'children', 'file_assets']);
    const user = await getOrCreateUser(openid);
    if ((user.status ?? 1) !== 1) {
      return { code: 403, message: '账号已停用', data: null };
    }

    switch (action) {
      case 'create':
        return await createFileAsset(user._id, data);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    console.error('file-assets failed', err);
    return { code: 500, message: '服务暂时不可用', data: null };
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
      nickname: null,
      avatar_url: null,
      phone: null,
      role: 'user',
      status: 1,
      created_at: now,
      updated_at: now,
      last_login_at: now,
    },
  });

  return {
    _id: res._id,
    openid,
    nickname: null,
    avatar_url: null,
    phone: null,
    role: 'user',
    status: 1,
  };
}

async function createFileAsset(userId, data) {
  const { fileID, biz_type, child_id, file_name, file_ext, file_size } = data;

  if (!fileID || !biz_type || !child_id) {
    return { code: 400, message: '缺少必要参数', data: null };
  }

  if (!ALLOWED_BIZ_TYPES.includes(biz_type)) {
    return { code: 400, message: '文件业务类型不支持', data: null };
  }

  const numericSize = Number(file_size || 0);
  if (numericSize > 10 * 1024 * 1024) {
    return { code: 400, message: '单张图片不能超过10M', data: null };
  }

  const normalizedExt = String(file_ext || '').toLowerCase();
  if (!normalizedExt || !ALLOWED_EXTS.includes(normalizedExt)) {
    return { code: 400, message: '文件类型不支持', data: null };
  }

  const expectedPath = `/uploads/${biz_type}/${child_id}/`;
  const fileIDText = String(fileID);
  if (!fileIDText.includes(expectedPath) || !fileIDText.toLowerCase().endsWith(`.${normalizedExt}`)) {
    return { code: 400, message: '文件路径与业务参数不匹配', data: null };
  }

  const childRes = await db.collection('children').where({ _id: child_id, user_id: userId }).get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  const now = db.serverDate();
  const assetData = {
    user_id: userId,
    fileID,
    biz_type,
    child_id: child_id || null,
    file_name: file_name || null,
    file_ext: normalizedExt || null,
    file_size: numericSize || null,
    created_at: now,
    updated_at: now,
  };

  const res = await db.collection('file_assets').add({ data: assetData });
  return { code: 0, message: 'created', data: { _id: res._id, ...assetData } };
}
