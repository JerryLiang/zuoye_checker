"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reward_1 = require("../../../../api/reward");
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
        const res = await reward_1.rewardApi.overview(app.globalData.currentChildId);
        this.setData({
            totalPoints: res.data.account?.total_points || 0,
            streakDays: res.data.account?.streak_days || 0,
            records: res.data.records || [],
        });
    },
});
