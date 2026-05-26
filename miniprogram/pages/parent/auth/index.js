'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const auth_1 = require('../../../api/auth');
const parentAuth_1 = require('../../../utils/parentAuth');
Page({
  data: {
    pin: '',
    hasPin: true,
    loading: false,
    redirect: '/pages/parent/home/index',
  },
  async onLoad(options) {
    this.setData({ redirect: options.redirect ? decodeURIComponent(options.redirect) : '/pages/parent/home/index' });
    await this.loadStatus();
  },
  async loadStatus() {
    try {
      this.setData({ loading: true });
      const app = getApp();
      await app.globalData.loginPromise;
      const res = await auth_1.authApi.parentStatus();
      this.setData({ hasPin: !!res.data.has_pin });
    } catch (e) {
      wx.showToast({ title: e?.message || '认证初始化失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  onPinInput(e) {
    this.setData({
      pin: String(e.detail.value || '')
        .replace(/\D/g, '')
        .slice(0, 6),
    });
  },
  async onSubmit() {
    const pin = this.data.pin;
    if (!/^\d{4,6}$/.test(pin)) {
      wx.showToast({ title: '请输入4-6位数字PIN', icon: 'none' });
      return;
    }
    try {
      this.setData({ loading: true });
      const res = this.data.hasPin
        ? await auth_1.authApi.verifyParentPin(pin)
        : await auth_1.authApi.setupParentPin(pin);
      (0, parentAuth_1.setParentAuthed)(res.data?.authed_until);
      wx.setStorageSync('activeRole', 'parent');
      wx.showToast({ title: this.data.hasPin ? '认证成功' : '设置成功', icon: 'success' });
      setTimeout(() => this.redirectAfterAuth(), 350);
    } catch (e) {
      wx.showToast({ title: e?.message || '认证失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  redirectAfterAuth() {
    const redirect = this.data.redirect || '/pages/parent/home/index';
    if (
      redirect.startsWith('/pages/index/') ||
      redirect.startsWith('/pages/tasks/') ||
      redirect.startsWith('/pages/reward/') ||
      redirect.startsWith('/pages/profile/')
    ) {
      wx.switchTab({ url: redirect.split('?')[0] });
      return;
    }
    wx.redirectTo({ url: redirect });
  },
});
