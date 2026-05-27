export interface LoginPayload {
  nickname?: string;
  avatar_url?: string;
}

export interface LoginResult {
  code: number;
  message: string;
  data: {
    is_new: boolean;
    user: { id: string; nickname: string; avatar_url: string };
  };
}

export const authApi = {
  async wechatLogin(): Promise<LoginResult> {
    const res = await wx.cloud.callFunction({
      name: 'auth-login',
      data: { action: 'login' },
    });

    const result = res.result as LoginResult | undefined;
    if (!result) {
      throw new Error('登录云函数无返回');
    }
    if (result.code !== 0) {
      throw new Error(result.message || '登录失败');
    }
    return result;
  },

  async updateProfile(nickname: string, avatar_url: string) {
    return callAuth('update_profile', { nickname, avatar_url });
  },

  async parentStatus() {
    return callAuth('parent_status');
  },

  async setupParentPin(pin: string) {
    return callAuth('setup_parent_pin', { pin });
  },

  async verifyParentPin(pin: string) {
    return callAuth('verify_parent_pin', { pin });
  },
};

async function callAuth(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'auth-login',
    data: { action, ...data },
  });
  const result = res.result as { code: number; message: string; data: any } | undefined;
  if (!result) {
    throw new Error('登录云函数无返回');
  }
  if (result.code !== 0) {
    throw new Error(result.message || '认证失败');
  }
  return result;
}
