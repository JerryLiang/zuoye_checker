const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { action = 'login', nickname, avatar_url, pin } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    await ensureCollection('users');
    const user = await getOrCreateUser(openid, { nickname, avatar_url });

    switch (action) {
      case 'login':
        return buildLoginResult(user);
      case 'update_profile':
        return await updateProfile(user, { nickname, avatar_url });
      case 'parent_status':
        return { code: 0, message: 'ok', data: { has_pin: !!user.parent_pin_hash } };
      case 'setup_parent_pin':
        return await setupParentPin(user, pin);
      case 'verify_parent_pin':
        return await verifyParentPin(user, pin);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
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

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function getOrCreateUser(openid, profile = {}) {
  const token = generateToken();
  const userRes = await db.collection('users').where({ openid }).get();
  if (userRes.data.length > 0) {
    const user = userRes.data[0];
    await db
      .collection('users')
      .doc(user._id)
      .update({
        data: {
          nickname: profile.nickname || user.nickname || null,
          avatar_url: profile.avatar_url || user.avatar_url || null,
          status: 1,
          api_token: token,
          updated_at: db.serverDate(),
        },
      });
    return {
      ...user,
      api_token: token,
      nickname: profile.nickname || user.nickname || null,
      avatar_url: profile.avatar_url || user.avatar_url || null,
      is_new: false,
    };
  }

  const now = db.serverDate();
  const res = await db.collection('users').add({
    data: {
      openid,
      nickname: profile.nickname || null,
      avatar_url: profile.avatar_url || null,
      status: 1,
      api_token: token,
      parent_pin_hash: null,
      parent_pin_salt: null,
      parent_pin_updated_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    _id: res._id,
    openid,
    nickname: profile.nickname || null,
    avatar_url: profile.avatar_url || null,
    api_token: token,
    parent_pin_hash: null,
    parent_pin_salt: null,
    is_new: true,
  };
}

function buildLoginResult(user) {
  return {
    code: 0,
    message: 'ok',
    data: {
      token: user.api_token,
      is_new: !!user.is_new,
      user: {
        id: user._id,
        openid: user.openid,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
      },
    },
  };
}

async function updateProfile(user, profile) {
  const updateData = { updated_at: db.serverDate() };
  if (profile.nickname !== undefined) updateData.nickname = profile.nickname;
  if (profile.avatar_url !== undefined) updateData.avatar_url = profile.avatar_url;

  await db.collection('users').doc(user._id).update({ data: updateData });

  return {
    code: 0,
    message: 'ok',
    data: {
      nickname: updateData.nickname || user.nickname,
      avatar_url: updateData.avatar_url || user.avatar_url,
    },
  };
}

function validatePin(pin) {
  const value = String(pin || '').trim();
  return /^\d{4,6}$/.test(value) ? value : '';
}

function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

async function setupParentPin(user, pin) {
  const value = validatePin(pin);
  if (!value) {
    return { code: 400, message: '请输入4-6位数字PIN', data: null };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const parentPinHash = hashPin(value, salt);
  await db
    .collection('users')
    .doc(user._id)
    .update({
      data: {
        parent_pin_hash: parentPinHash,
        parent_pin_salt: salt,
        parent_pin_updated_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    });

  return { code: 0, message: 'ok', data: { authed_until: Date.now() + 30 * 60 * 1000 } };
}

async function verifyParentPin(user, pin) {
  const value = validatePin(pin);
  if (!value) {
    return { code: 400, message: '请输入4-6位数字PIN', data: null };
  }
  if (!user.parent_pin_hash || !user.parent_pin_salt) {
    return { code: 404, message: '请先设置家长PIN', data: null };
  }

  const inputHash = hashPin(value, user.parent_pin_salt);
  if (inputHash !== user.parent_pin_hash) {
    return { code: 403, message: 'PIN错误', data: null };
  }

  return { code: 0, message: 'ok', data: { authed_until: Date.now() + 30 * 60 * 1000 } };
}
