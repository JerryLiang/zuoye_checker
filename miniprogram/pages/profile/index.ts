import { childApi, ChildItem } from '../../api/child';
import { clearParentAuth } from '../../utils/parentAuth';

Page({
  data: {
    nickname: '学生端',
    childCount: 0,
    children: [] as ChildItem[],
  },

  async onShow() {
    await this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await childApi.list();
      const children = res.data || [];
      this.setData({
        children,
        childCount: children.length,
      });
    } catch (_e) {
      // 未登录时静默处理
    }
  },

  goRoleSelect() {
    wx.reLaunch({ url: '/pages/role/select/index' });
  },

  goParentHome() {
    wx.navigateTo({ url: '/pages/parent/auth/index?redirect=/pages/parent/home/index' });
  },

  goTodayTasks() {
    wx.switchTab({ url: '/pages/tasks/today/index' });
  },

  goReward() {
    wx.switchTab({ url: '/pages/reward/index/index' });
  },

  onClearCache() {
    wx.showModal({
      title: '确认',
      content: '清除本地缓存后需要重新登录，确定吗？',
      success(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          clearParentAuth();
          const app = getApp<IAppOption>();
          app.globalData.token = '';
          app.globalData.userId = '';
          app.globalData.currentChildId = '';
          wx.showToast({ title: '已清除', icon: 'success' });
          wx.reLaunch({ url: '/pages/role/select/index' });
        }
      },
    });
  },
});

interface IAppOption {
  globalData: {
    token: string;
    userId: string;
    currentChildId: string;
  };
}
