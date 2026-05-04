const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const ALLOWED_BIZ_TYPES = ['homework_input', 'task_submission'];
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'];

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const userRes = await db.collection('users').where({ openid }).get();
  if (userRes.data.length === 0) {
    return { code: 401, message: '未登录', data: null };
  }
  const user = userRes.data[0];

  try {
    switch (action) {
      case 'create':
        return await createFileAsset(user._id, data);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function createFileAsset(userId, data) {
  const { fileID, biz_type, child_id, file_name, file_ext } = data;

  if (!fileID || !biz_type || !child_id) {
    return { code: 400, message: '缺少必要参数', data: null };
  }

  if (!ALLOWED_BIZ_TYPES.includes(biz_type)) {
    return { code: 400, message: '文件业务类型不支持', data: null };
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

  const childRes = await db.collection('children')
    .where({ _id: child_id, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '孩子不存在', data: null };
  }

  const now = db.serverDate();
  const assetData = {
    user_id: userId,
    fileID,
    biz_type,
    child_id: child_id || null,
    file_name: file_name || null,
    file_ext: normalizedExt || null,
    created_at: now,
    updated_at: now,
  };

  const res = await db.collection('file_assets').add({ data: assetData });
  return { code: 0, message: 'created', data: { _id: res._id, ...assetData } };
}
