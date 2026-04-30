import { rewardApi } from '../../../api/reward';

Page({
  data: {
    totalPoints: 0,
    streakDays: 0,
    records: [] as Array<{ id: number; description: string; points: number }>,
  },

  async onShow() {
    const app = getApp<IAppOption>();
    if (!app.globalData.currentChildId) return;

    const res = await rewardApi.overview(app.globalData.currentChildId);
    this.setData({
      totalPoints: res.data.account?.total_points || 0,
      streakDays: res.data.account?.streak_days || 0,
      records: res.data.records || [],
    });
  },
});

interface IAppOption {
  globalData: {
    currentChildId: number;
  };
}
