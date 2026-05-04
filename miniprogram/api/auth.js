const authApi = {
  async wechatLogin(payload) {
    // 先获取登录code
    const loginRes = await new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject,
      });
    });

    const res = await wx.cloud.callFunction({
      name: 'auth-login',
      data: {
        code: loginRes.code,
        nickname: payload.nickname,
        avatar_url: payload.avatar_url,
      },
    });

    return res.result;
  },
};

module.exports = { authApi };
