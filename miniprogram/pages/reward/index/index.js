const { rewardApi } = require('../../../api/reward');

Page({
  data: {
    totalPoints: 0,
    streakDays: 0,
    records: [],
  },

  async onShow() {
    var app = getApp();
    if (!app.globalData.currentChildId) return;

    var res = await rewardApi.overview(app.globalData.currentChildId);
    this.setData({
      totalPoints: (res.data.account && res.data.account.total_points) || 0,
      streakDays: (res.data.account && res.data.account.streak_days) || 0,
      records: res.data.records || [],
    });
  },
});
