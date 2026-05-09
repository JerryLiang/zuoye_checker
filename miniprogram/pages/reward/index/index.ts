import { rewardApi } from '../../../api/reward';

interface RewardRecordView {
  _id: string;
  description: string;
  points: number;
  createdText: string;
}

Page({
  data: {
    loading: false,
    totalPoints: 0,
    streakDays: 0,
    todayCompleted: 0,
    todayTotal: 0,
    records: [] as RewardRecordView[],
  },

  async onShow() {
    await this.loadRewards();
  },

  async loadRewards() {
    const app = getApp<IAppOption>();
    if (!app.globalData.currentChildId) {
      wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
      return;
    }

    try {
      this.setData({ loading: true });
      const res = await rewardApi.overview(app.globalData.currentChildId);
      const account = res.data.account || res.data;
      const todayCompletion = res.data.today_completion || {};
      const records = (res.data.records || res.data.recent_records || []).map((item: any) => ({
        _id: item._id,
        description: item.description || '完成任务奖励积分',
        points: item.points || 0,
        createdText: this.formatTime(item.created_at),
      }));

      this.setData({
        totalPoints: account?.total_points || 0,
        streakDays: account?.streak_days || 0,
        todayCompleted: todayCompletion.completed_tasks || 0,
        todayTotal: todayCompletion.total_tasks || 0,
        records,
      });
    } catch (err: any) {
      wx.showToast({ title: err.message || '积分加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatTime(value: any): string {
    if (!value) return '';
    const raw = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(raw.getTime())) return '';
    const month = raw.getMonth() + 1;
    const day = raw.getDate();
    const hour = String(raw.getHours()).padStart(2, '0');
    const minute = String(raw.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  async onRefresh() {
    await this.loadRewards();
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});

interface IAppOption {
  globalData: {
    currentChildId: string;
  };
}
