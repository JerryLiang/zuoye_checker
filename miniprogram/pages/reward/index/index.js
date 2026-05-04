"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reward_1 = require("../../../api/reward");
Page({
    data: {
        totalPoints: 0,
        streakDays: 0,
        records: [],
    },
    async onShow() {
        const app = getApp();
        if (!app.globalData.currentChildId)
            return;
        try {
            const res = await reward_1.rewardApi.overview(app.globalData.currentChildId);
            const account = res.data.account || res.data;
            this.setData({
                totalPoints: account?.total_points || 0,
                streakDays: account?.streak_days || 0,
                records: res.data.records || res.data.recent_records || [],
            });
        }
        catch (err) {
            wx.showToast({ title: err.message || '积分加载失败', icon: 'none' });
        }
    },
});
