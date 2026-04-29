import { homeworkApi, HomeworkBatch, TaskInBatch } from '../../../../api/homework';

Page({
  data: {
    batch: null as HomeworkBatch | null,
    tasks: [] as TaskInBatch[],
    loading: true,
    batchId: 0,
    doneCount: 0,
    totalCount: 0,
  },

  onLoad(options: Record<string, string>) {
    if (options.id) {
      this.setData({ batchId: Number(options.id) });
      this.loadDetail(Number(options.id));
    }
  },

  async loadDetail(id: number) {
    try {
      this.setData({ loading: true });
      const res = await homeworkApi.get(id);
      const batch = res.data;
      const tasks = batch.tasks || [];
      const doneCount = tasks.filter((t: TaskInBatch) => t.status === 2).length;
      this.setData({ batch, tasks, doneCount, totalCount: tasks.length });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goSubmit(e: WechatMiniprogram.BaseEvent) {
    const id = Number(e.currentTarget.dataset.id);
    wx.navigateTo({ url: `/pages/tasks/submit/index?taskId=${id}` });
  },

  async onDeleteBatch() {
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
