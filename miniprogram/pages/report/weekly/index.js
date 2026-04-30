"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const report_1 = require("../../../../api/report");
Page({
    data: {
        report: null,
        loading: true,
        weekLabel: '',
    },
    onShow() {
        this.loadReport();
    },
    async loadReport() {
        const app = getApp();
        const childId = app.globalData.currentChildId;
        if (!childId) {
            this.setData({ loading: false });
            return;
        }
        try {
            this.setData({ loading: true });
            const res = await report_1.reportApi.weekly(childId);
            const report = res.data;
            const weekLabel = `${report.week_start} ~ ${report.week_end}`;
            this.setData({ report, weekLabel });
        }
        catch (_e) {
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onPrevWeek() {
        const app = getApp();
        const childId = app.globalData.currentChildId;
        if (!childId || !this.data.report)
            return;
        const prevStart = this.getPrevWeekStart(this.data.report.week_start);
        this.fetchWeek(childId, prevStart);
    },
    onNextWeek() {
        const app = getApp();
        const childId = app.globalData.currentChildId;
        if (!childId || !this.data.report)
            return;
        const nextStart = this.getNextWeekStart(this.data.report.week_start);
        this.fetchWeek(childId, nextStart);
    },
    async fetchWeek(childId, startDate) {
        try {
            this.setData({ loading: true });
            const res = await report_1.reportApi.weekly(childId, startDate);
            const report = res.data;
            const weekLabel = `${report.week_start} ~ ${report.week_end}`;
            this.setData({ report, weekLabel });
        }
        catch (_e) {
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    getPrevWeekStart(currentStart) {
        const d = new Date(currentStart);
        d.setDate(d.getDate() - 7);
        return this.formatDate(d);
    },
    getNextWeekStart(currentStart) {
        const d = new Date(currentStart);
        d.setDate(d.getDate() + 7);
        return this.formatDate(d);
    },
    formatDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },
    async onRefresh() {
        await this.loadReport();
        wx.showToast({ title: '已刷新', icon: 'success' });
    },
});
