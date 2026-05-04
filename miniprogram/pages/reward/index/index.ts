import { rewardApi } from '../../../api/reward';

Page({
  data: {
    totalPoints: 0,
    streakDays: 0,
    records: [] as Array<{ _id: string; description: string; points: number }>,
  },

  async onShow() {
    const app = getApp<IAppOption>();
    if (!app.globalData.currentChildId) return;

    try {
      const res = await rewardApi.overview(app.globalData.currentChildId);
      const account = res.data.account || res.data;
      this.setData({
        totalPoints: account?.total_points || 0,
        streakDays: account?.streak_days || 0,
        records: res.data.records || res.data.recent_records || [],
      });
    } catch (err: any) {
      wx.showToast({ title: err.message || '积分加载失败', icon: 'none' });
    }
  },
});

interface IAppOption {
  globalData: {
    currentChildId: string;
  };
}
