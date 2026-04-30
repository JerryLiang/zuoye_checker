import { childApi, ChildItem } from '../../api/child';

Page({
  data: {
    nickname: '家长用户',
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

  goChildList() {
    wx.navigateTo({ url: '/pages/child/list/index' });
  },

  goAddChild() {
    wx.navigateTo({ url: '/pages/child/edit/index' });
  },

  goWeeklyReport() {
    wx.navigateTo({ url: '/pages/report/weekly/index' });
  },

  onClearCache() {
    wx.showModal({
      title: '确认',
      content: '清除本地缓存后需要重新登录，确定吗？',
      success(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          const app = getApp<IAppOption>();
          app.globalData.token = '';
          app.globalData.userId = '';
          app.globalData.currentChildId = '';
          wx.showToast({ title: '已清除', icon: 'success' });
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
