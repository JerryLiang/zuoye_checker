import { homeworkApi, HomeworkBatch, TaskInBatch } from '../../../api/homework';
import { taskApi } from '../../../api/task';
import { requireParentAuth } from '../../../utils/parentAuth';

Page({
  data: {
    batch: null as HomeworkBatch | null,
    tasks: [] as TaskInBatch[],
    loading: true,
    batchId: '',
    doneCount: 0,
    totalCount: 0,
    progressPct: 0,
    canManage: false,
  },

  onLoad(options: Record<string, string>) {
    const canManage = options.role === 'parent';
    const redirect = options.id ? `/pages/homework/detail/index?id=${options.id}&role=parent` : '/pages/parent/home/index';
    if (canManage && !requireParentAuth(redirect)) return;
    if (options.id) {
      this.setData({ batchId: options.id, canManage });
      this.loadDetail(options.id);
    }
  },

  async loadDetail(id: string) {
    try {
      this.setData({ loading: true });
      const res = await homeworkApi.get(id);
      const batch = res.data;
      const tasks = batch.tasks || [];
      const doneCount = tasks.filter((t: TaskInBatch) => t.status === 2).length;
      const totalCount = tasks.length;
      const progressPct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
      this.setData({ batch, tasks, doneCount, totalCount, progressPct });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goSubmit(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/tasks/submit/index?taskId=${id}` });
  },

  async onApproveTask(e: WechatMiniprogram.BaseEvent) {
    if (!this.data.canManage) return;
    const taskId = e.currentTarget.dataset.id;
    if (!taskId || !this.data.batch?.child_id) return;

    const res = await wx.showModal({
      title: '确认检查通过',
      content: '检查通过后任务会变为已完成，并发放奖励积分。',
    });
    if (!res.confirm) return;

    try {
      await taskApi.review(taskId, { child_id: this.data.batch.child_id, approved: true });
      wx.showToast({ title: '已完成并发放积分', icon: 'success' });
      await this.loadDetail(this.data.batchId);
    } catch (e: any) {
      wx.showToast({ title: e?.message || '检查失败', icon: 'none' });
    }
  },

  async onDeleteBatch() {
    const redirect = this.data.batchId ? `/pages/homework/detail/index?id=${this.data.batchId}&role=parent` : '/pages/parent/home/index';
    if (!requireParentAuth(redirect)) return;

    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除这批作业吗？',
    });
    if (!res.confirm) return;

    try {
      await homeworkApi.remove(this.data.batchId);
      wx.showToast({ title: '已删除', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (_e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  async onRefresh() {
    await this.loadDetail(this.data.batchId);
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});
