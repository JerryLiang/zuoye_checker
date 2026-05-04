const { homeworkApi } = require('../../../api/homework');

Page({
  data: {
    batch: null,
    tasks: [],
    loading: true,
    batchId: '',
    doneCount: 0,
    totalCount: 0,
    progressPct: 0,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ batchId: options.id });
      this.loadDetail(options.id);
    }
  },

  async loadDetail(id) {
    try {
      this.setData({ loading: true });
      var res = await homeworkApi.get(id);
      var batch = res.data;
      var tasks = batch.tasks || [];
      var doneCount = tasks.filter(function (t) { return t.status === 2; }).length;
      var totalCount = tasks.length;
      var progressPct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
      this.setData({ batch: batch, tasks: tasks, doneCount: doneCount, totalCount: totalCount, progressPct: progressPct });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goSubmit(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/tasks/submit/index?taskId=' + id });
  },

  async onDeleteBatch() {
    var res = await wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除这批作业吗？',
    });
    if (!res.confirm) return;

    try {
      await homeworkApi.remove(this.data.batchId);
      wx.showToast({ title: '已删除', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 500);
    } catch (_e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  async onRefresh() {
    await this.loadDetail(this.data.batchId);
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});
