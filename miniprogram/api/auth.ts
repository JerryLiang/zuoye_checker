export interface LoginPayload {
  code?: string;
  nickname?: string;
  avatar_url?: string;
}

export const authApi = {
  async wechatLogin(payload: LoginPayload = {}) {
    let code = payload.code;
    if (!code) {
      const loginRes = await new Promise<{ code: string }>((resolve, reject) => {
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
        code,
        nickname: payload.nickname,
        avatar_url: payload.avatar_url,
      },
    });

    const result = res.result as { code: number; message: string; data: { token: string; user: { id: string } } } | undefined;
    if (!result) {
      throw new Error('登录云函数无返回');
    }
    if (result.code !== 0) {
      throw new Error(result.message || '登录失败');
    }
    return result;
  },
};
