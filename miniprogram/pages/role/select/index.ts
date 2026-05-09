Page({
  goChild() {
    wx.setStorageSync('activeRole', 'child');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goParent() {
    wx.setStorageSync('activeRole', 'parent');
    wx.navigateTo({ url: '/pages/parent/auth/index?redirect=/pages/parent/home/index' });
  },
});
