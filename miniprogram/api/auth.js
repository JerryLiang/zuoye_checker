'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.authApi = void 0;
exports.authApi = {
  async wechatLogin(payload = {}) {
    let code = payload.code;
    if (!code) {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });
      code = loginRes.code;
    }
    const res = await wx.cloud.callFunction({
      name: 'auth-login',
      data: {
        action: 'login',
        code,
        nickname: payload.nickname,
        avatar_url: payload.avatar_url,
      },
    });
    const result = res.result;
    if (!result) {
      throw new Error('登录云函数无返回');
    }
    if (result.code !== 0) {
      throw new Error(result.message || '登录失败');
    }
    return result;
  },
  async updateProfile(nickname, avatar_url) {
    return callAuth('update_profile', { nickname, avatar_url });
  },
  async parentStatus() {
    return callAuth('parent_status');
  },
  async setupParentPin(pin) {
    return callAuth('setup_parent_pin', { pin });
  },
  async verifyParentPin(pin) {
    return callAuth('verify_parent_pin', { pin });
  },
};
async function callAuth(action, data = {}) {
  const res = await wx.cloud.callFunction({
    name: 'auth-login',
    data: { action, ...data },
  });
  const result = res.result;
  if (!result) {
    throw new Error('登录云函数无返回');
  }
  if (result.code !== 0) {
    throw new Error(result.message || '认证失败');
  }
  return result;
}
