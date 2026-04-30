export interface LoginPayload {
  code?: string;
  nickname?: string;
  avatar_url?: string;
}

export const authApi = {
  async wechatLogin(payload: LoginPayload) {
    // 先获取登录code
    const loginRes = await new Promise<{ code: string }>((resolve, reject) => {
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

    return res.result as { code: number; message: string; data: { token: string; user: { id: string } } };
  },
};
