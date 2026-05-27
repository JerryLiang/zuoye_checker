'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const auth_1 = require('../../../api/auth');
Page({
  data: {
    nickname: '',
    avatarUrl: '',
    tempAvatarUrl: '',
    loading: false,
  },
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({ avatarUrl, tempAvatarUrl: avatarUrl });
  },
  onNicknameInput(e) {
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
      await auth_1.authApi.updateProfile(nickname, avatarUrl);
      const app = getApp();
      app.globalData.nickname = nickname;
      app.globalData.avatarUrl = avatarUrl;
      this.goNext();
    } catch (err) {
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
