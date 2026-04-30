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
    return { code: 500, message: err.message, data: null };
  }
};

async function listChildren(userId) {
  const res = await db.collection('children')
    .where({ user_id: userId })
    .orderBy('_id', 'desc')
    .get();

  return { code: 0, message: 'ok', data: res.data };
}

async function getChild(userId, id) {
  const res = await db.collection('children')
    .where({ _id: id, user_id: userId })
    .get();

  if (res.data.length === 0) {
    return { code: 404, message: '孩子不存在', data: null };
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

  const res = await db.collection('children')
    .where({ _id: id, user_id: userId })
    .update({ data: updateData });

  if (res.stats.updated === 0) {
    return { code: 404, message: '孩子不存在', data: null };
  }

  return { code: 0, message: 'updated', data: { _id: id, ...data } };
}

async function deleteChild(userId, id) {
  const res = await db.collection('children')
    .where({ _id: id, user_id: userId })
    .remove();

  if (res.stats.removed === 0) {
    return { code: 404, message: '孩子不存在', data: null };
  }

  return { code: 0, message: 'deleted', data: null };
}
