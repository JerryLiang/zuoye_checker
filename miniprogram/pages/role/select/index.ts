import { isParentAuthed } from '../../../utils/parentAuth';

Page({
  async onLoad() {
    const app = getApp<IAppOption>();
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
    if (isParentAuthed()) {
      wx.navigateTo({ url: '/pages/parent/home/index' });
    } else {
      wx.navigateTo({ url: '/pages/parent/auth/index?redirect=/pages/parent/home/index' });
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
  };
}
