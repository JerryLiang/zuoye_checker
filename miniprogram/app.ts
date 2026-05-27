import envConfig from './env/config';
import { authApi } from './api/auth';

App<IAppOption>({
  globalData: {
    token: '',
    userId: '',
    currentChildId: '',
    loginPromise: null as Promise<void> | null,
    isNewUser: false,
    nickname: '',
    avatarUrl: '',
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: envConfig.cloudEnvId,
        traceUser: true,
      });
    }

    const token = wx.getStorageSync('token');
    const userId = wx.getStorageSync('userId');
    const currentChildId = wx.getStorageSync('currentChildId');

    if (token) this.globalData.token = token;
    if (userId) this.globalData.userId = userId;
    if (currentChildId) this.globalData.currentChildId = currentChildId;

    this.globalData.loginPromise = this.ensureLogin();
  },

  async ensureLogin() {
    try {
      const loginRes = await authApi.wechatLogin({ nickname: '家长用户' });
      const newUserId = loginRes.data.user.id;

      if (this.globalData.userId && this.globalData.userId !== newUserId) {
        wx.removeStorageSync('currentChildId');
        this.globalData.currentChildId = '';
      }

      this.globalData.token = loginRes.data.token;
      this.globalData.userId = newUserId;
      this.globalData.isNewUser = !!loginRes.data.is_new;
      this.globalData.nickname = loginRes.data.user.nickname || '';
      this.globalData.avatarUrl = loginRes.data.user.avatar_url || '';
      wx.setStorageSync('token', loginRes.data.token);
      wx.setStorageSync('userId', newUserId);
    } catch (err) {
      console.error('自动登录失败', err);
    }
  },
});

interface IAppOption {
  globalData: {
    token: string;
    userId: string;
    currentChildId: string;
    loginPromise: Promise<void> | null;
    isNewUser: boolean;
    nickname: string;
    avatarUrl: string;
  };
  ensureLogin(): Promise<void>;
}
