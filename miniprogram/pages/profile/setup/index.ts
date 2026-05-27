import { authApi } from '../../../api/auth';

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    tempAvatarUrl: '',
    loading: false,
  },

  onChooseAvatar(e: any) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({ avatarUrl, tempAvatarUrl: avatarUrl });
  },

  onNicknameInput(e: WechatMiniprogram.Input) {
    this.setData({ nickname: String(e.detail.value || '').trim() });
  },

  async onSubmit() {
    const nickname = this.data.nickname;
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });

      let avatarUrl = this.data.avatarUrl;
      if (this.data.tempAvatarUrl && this.data.tempAvatarUrl.startsWith('http')) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}.jpg`,
          filePath: this.data.tempAvatarUrl,
        });
        avatarUrl = uploadRes.fileID;
      }

      await authApi.updateProfile(nickname, avatarUrl);

      const app = getApp<IAppOption>();
      app.globalData.nickname = nickname;
      app.globalData.avatarUrl = avatarUrl;

      this.goNext();
    } catch (err: any) {
      wx.showToast({ title: err?.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSkip() {
    this.goNext();
  },

  goNext() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});

interface IAppOption {
  globalData: {
    token: string;
    userId: string;
    currentChildId: string;
    loginPromise: Promise<void> | null;
    nickname: string;
    avatarUrl: string;
  };
}
