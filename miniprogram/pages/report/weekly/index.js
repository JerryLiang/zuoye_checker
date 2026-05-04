const { reportApi } = require('../../../api/report');

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
    var app = getApp();
    var childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ loading: false });
      return;
    }

    try {
      this.setData({ loading: true });
      var res = await reportApi.weekly(childId);
      var report = res.data;
      var weekLabel = report.week_start + ' ~ ' + report.week_end;
      this.setData({ report: report, weekLabel: weekLabel });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPrevWeek() {
    var app = getApp();
    var childId = app.globalData.currentChildId;
    if (!childId || !this.data.report) return;

    var prevStart = this.getPrevWeekStart(this.data.report.week_start);
    this.fetchWeek(childId, prevStart);
  },

  onNextWeek() {
    var app = getApp();
    var childId = app.globalData.currentChildId;
    if (!childId || !this.data.report) return;

    var nextStart = this.getNextWeekStart(this.data.report.week_start);
    this.fetchWeek(childId, nextStart);
  },

  async fetchWeek(childId, startDate) {
    try {
      this.setData({ loading: true });
      var res = await reportApi.weekly(childId, startDate);
      var report = res.data;
      var weekLabel = report.week_start + ' ~ ' + report.week_end;
      this.setData({ report: report, weekLabel: weekLabel });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  getPrevWeekStart(currentStart) {
    var d = new Date(currentStart);
    d.setDate(d.getDate() - 7);
    return this.formatDate(d);
  },

  getNextWeekStart(currentStart) {
    var d = new Date(currentStart);
    d.setDate(d.getDate() + 7);
    return this.formatDate(d);
  },

  formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  async onRefresh() {
    await this.loadReport();
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});
