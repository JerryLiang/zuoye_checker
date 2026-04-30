const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { code, nickname, avatar_url } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    // 查找或创建用户
    const userRes = await db.collection('users').where({ openid }).get();
    let user;

    if (userRes.data.length > 0) {
      // 更新用户信息
      user = userRes.data[0];
      await db.collection('users').doc(user._id).update({
        data: {
          nickname: nickname || user.nickname,
          avatar_url: avatar_url || user.avatar_url,
          status: 1,
          api_token: generateToken(),
          updated_at: db.serverDate(),
        },
      });
      user.api_token = generateToken();
    } else {
      // 创建新用户
      const token = generateToken();
      const now = db.serverDate();
      const res = await db.collection('users').add({
        data: {
          openid,
          nickname: nickname || null,
          avatar_url: avatar_url || null,
          status: 1,
          api_token: token,
          created_at: now,
          updated_at: now,
        },
      });
      user = {
        _id: res._id,
        openid,
        nickname: nickname || null,
        avatar_url: avatar_url || null,
        api_token: token,
      };
    }

    return {
      code: 0,
      message: 'ok',
      data: {
        token: user.api_token,
        user: {
          id: user._id,
          openid: user.openid,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
        },
      },
    };
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 60; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
