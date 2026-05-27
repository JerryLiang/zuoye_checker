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
    const user = await getOrCreateUser(openid);
    if ((user.status ?? 1) !== 1) {
      return { code: 403, message: '账号已停用', data: null };
    }

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
    console.error('auth-login failed', err);
    return { code: 500, message: '服务暂时不可用', data: null };
  }
};

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
    const user = userRes.data[0];
    const updateData = {
      status: user.status ?? 1,
      last_login_at: db.serverDate(),
      updated_at: db.serverDate(),
    };
    await db.collection('users').doc(user._id).update({ data: updateData });
    return { ...user, ...updateData, is_new: false };
  }

  const now = db.serverDate();
  const userData = {
    openid,
    nickname: null,
    avatar_url: null,
    phone: null,
    role: 'user',
    status: 1,
    parent_pin_hash: null,
    parent_pin_salt: null,
    parent_pin_updated_at: null,
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };
  const res = await db.collection('users').add({ data: userData });
  return { _id: res._id, ...userData, is_new: true };
}

function buildLoginResult(user) {
  return {
    code: 0,
    message: 'ok',
    data: {
      is_new: !!user.is_new,
      user: {
        id: user._id,
        nickname: user.nickname || '',
        avatar_url: user.avatar_url || '',
      },
    },
  };
}

async function updateProfile(user, profile) {
  const updateData = { updated_at: db.serverDate() };
  if (profile.nickname !== undefined) {
    updateData.nickname = sanitizeText(profile.nickname, 30) || null;
  }
  if (profile.avatar_url !== undefined) {
    const avatarUrl = sanitizeText(profile.avatar_url, 500);
    updateData.avatar_url = /^cloud:\/\/|^https?:\/\//.test(avatarUrl) ? avatarUrl : null;
  }

  await db.collection('users').doc(user._id).update({ data: updateData });
  return buildLoginResult({ ...user, ...updateData });
}

function sanitizeText(value, maxLen) {
  return String(value || '').replace(/[\r\n\x00]/g, ' ').trim().slice(0, maxLen);
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
  await db.collection('users').doc(user._id).update({
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
