const { taskApi } = require('../../../api/task');

Page({
  data: {
    tasks: [],
    totalTasks: 0,
    doneTasks: 0,
    loading: false,
    currentDate: '',
  },

  onLoad() {
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    var weekDay = weekDays[now.getDay()];
    this.setData({
      currentDate: month + '月' + day + '日 星期' + weekDay,
    });
  },

  async onShow() {
    await this.loadTasks();
  },

  async loadTasks() {
    var app = getApp();
    var childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ tasks: [], totalTasks: 0, doneTasks: 0 });
      return;
    }

    try {
      this.setData({ loading: true });
      var res = await taskApi.today(childId);
      var tasks = res.data || [];
      var done = tasks.filter(function (t) { return t.status === 2; }).length;
      this.setData({ tasks: tasks, totalTasks: tasks.length, doneTasks: done });
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

  async onRefresh() {
    await this.loadTasks();
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});
