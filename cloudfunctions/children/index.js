const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data, id } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    await ensureCollection('users');
    if (action === 'create' || action === 'list' || action === 'get' || action === 'update' || action === 'delete') {
      await ensureCollection('children');
    }

    const user = await getOrCreateUser(openid);
    if ((user.status ?? 1) !== 1) {
      return { code: 403, message: '账号已停用', data: null };
    }

    switch (action) {
      case 'list':
        return await listChildren(user._id);
      case 'get':
        return await getChild(user._id, id);
      case 'create':
        return await createChild(user._id, data);
      case 'update':
        return await updateChild(user._id, id, data);
      case 'delete':
        return await deleteChild(user._id, id);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    console.error('children failed', err);
    return { code: 500, message: '服务暂时不可用', data: null };
  }
};

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (err) {
    const msg = err && err.message ? err.message : '';
    // 已存在时忽略；其他错误继续抛出，避免掩盖权限/环境问题。
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

async function listChildren(userId) {
  const res = await db.collection('children').where({ user_id: userId }).orderBy('_id', 'desc').get();

  return { code: 0, message: 'ok', data: res.data };
}

async function getChild(userId, id) {
  const res = await db.collection('children').where({ _id: id, user_id: userId }).get();

  if (res.data.length === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  return { code: 0, message: 'ok', data: res.data[0] };
}

async function createChild(userId, data) {
  const now = db.serverDate();
  const childData = {
    user_id: userId,
    name: data.name,
    gender: data.gender || null,
    birth_date: data.birth_date || null,
    age_group: data.age_group,
    grade: data.grade || null,
    created_at: now,
    updated_at: now,
  };

  const res = await db.collection('children').add({ data: childData });

  return {
    code: 0,
    message: 'created',
    data: { _id: res._id, ...childData },
  };
}

async function updateChild(userId, id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.birth_date !== undefined) updateData.birth_date = data.birth_date;
  if (data.age_group !== undefined) updateData.age_group = data.age_group;
  if (data.grade !== undefined) updateData.grade = data.grade;
  updateData.updated_at = db.serverDate();

  const res = await db.collection('children').where({ _id: id, user_id: userId }).update({ data: updateData });

  if (res.stats.updated === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  return { code: 0, message: 'updated', data: { _id: id, ...data } };
}

async function deleteChild(userId, id) {
  const res = await db.collection('children').where({ _id: id, user_id: userId }).remove();

  if (res.stats.removed === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  return { code: 0, message: 'deleted', data: null };
}
