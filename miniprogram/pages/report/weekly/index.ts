import { reportApi, WeeklyReport } from '../../../api/report';

Page({
  data: {
    report: null as WeeklyReport | null,
    loading: true,
    weekLabel: '',
  },

  onShow() {
    this.loadReport();
  },

  async loadReport() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ loading: false });
      return;
    }

    try {
      this.setData({ loading: true });
      const res = await reportApi.weekly(childId);
      const report = res.data;
      const weekLabel = `${report.week_start} ~ ${report.week_end}`;
      this.setData({ report, weekLabel });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPrevWeek() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!childId || !this.data.report) return;

    const prevStart = this.getPrevWeekStart(this.data.report.week_start);
    this.fetchWeek(childId, prevStart);
  },

  onNextWeek() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!childId || !this.data.report) return;

    const nextStart = this.getNextWeekStart(this.data.report.week_start);
    this.fetchWeek(childId, nextStart);
  },

  async fetchWeek(childId: number, startDate: string) {
    try {
      this.setData({ loading: true });
      const res = await reportApi.weekly(childId, startDate);
      const report = res.data;
      const weekLabel = `${report.week_start} ~ ${report.week_end}`;
      this.setData({ report, weekLabel });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  getPrevWeekStart(currentStart: string): string {
    const d = new Date(currentStart);
    d.setDate(d.getDate() - 7);
    return this.formatDate(d);
  },

  getNextWeekStart(currentStart: string): string {
    const d = new Date(currentStart);
    d.setDate(d.getDate() + 7);
    return this.formatDate(d);
  },

  formatDate(d: Date): string {
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

interface IAppOption {
  globalData: {
    currentChildId: number;
  };
}
