const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { nickname, avatar_url } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    const token = generateToken();
    const userRes = await db.collection('users').where({ openid }).get();
    let user;

    if (userRes.data.length > 0) {
      user = userRes.data[0];
      await db.collection('users').doc(user._id).update({
        data: {
          nickname: nickname || user.nickname || null,
          avatar_url: avatar_url || user.avatar_url || null,
          status: 1,
          api_token: token,
          updated_at: db.serverDate(),
        },
      });
      user.api_token = token;
      user.nickname = nickname || user.nickname || null;
      user.avatar_url = avatar_url || user.avatar_url || null;
    } else {
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
  return crypto.randomBytes(32).toString('hex');
}
