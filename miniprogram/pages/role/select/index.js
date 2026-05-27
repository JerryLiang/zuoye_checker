'use strict';
Page({
  async onLoad() {
    const app = getApp();
    await app.globalData.loginPromise;
    if (app.globalData.isNewUser) {
      wx.navigateTo({ url: '/pages/profile/setup/index' });
    }
  },
  goChild() {
    wx.setStorageSync('activeRole', 'child');
    wx.switchTab({ url: '/pages/index/index' });
  },
  goParent() {
    wx.setStorageSync('activeRole', 'parent');
    wx.navigateTo({ url: '/pages/parent/auth/index?redirect=/pages/parent/home/index' });
  },
});
