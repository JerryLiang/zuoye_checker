import { homeworkApi, HomeworkBatch } from '../../../api/homework';
import { requireParentAuth } from '../../../utils/parentAuth';

type RoleMode = 'child' | 'parent';

type HistoryItem = HomeworkBatch & {
  displaySubject: string;
  progressText: string;
  progressPctValue: number;
};

Page({
  data: {
    loading: false,
    role: 'child' as RoleMode,
    childId: '',
    batches: [] as HistoryItem[],
  },

  async onLoad(options: Record<string, string>) {
    const role = options.role === 'parent' ? 'parent' : 'child';
    if (role === 'parent' && !requireParentAuth('/pages/homework/history/index?role=parent')) return;
    this.setData({ role });
    await this.loadHistory();
  },

  async onShow() {
    if (this.data.childId) {
      await this.loadHistory();
    }
  },

  async loadHistory() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ childId: '', batches: [] });
      wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
      return;
    }

    try {
      this.setData({ loading: true, childId });
      const res = await homeworkApi.list(childId);
      const batches = (res.data || []).map((item: HomeworkBatch) => {
        const total = item.total_tasks ?? item.tasks?.length ?? 0;
        const completed = item.completed_tasks ?? item.tasks?.filter((task) => task.status === 2).length ?? 0;
        const progressPctValue = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...item,
          displaySubject: item.subject || '综合',
          progressText: `${completed}/${total} 已完成`,
          progressPctValue,
        };
      });
      this.setData({ batches });
    } catch (e: any) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/homework/detail/index?id=${id}&role=${this.data.role}` });
  },

  async onRefresh() {
    await this.loadHistory();
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});

interface IAppOption {
  globalData: {
    currentChildId: string;
  };
}
