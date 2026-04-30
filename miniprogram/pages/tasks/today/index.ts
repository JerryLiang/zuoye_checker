import { taskApi, TaskItem } from '../../../api/task';

Page({
  data: {
    tasks: [] as TaskItem[],
    totalTasks: 0,
    doneTasks: 0,
    loading: false,
    currentDate: '',
  },

  onLoad() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[now.getDay()];
    this.setData({
      currentDate: `${month}月${day}日 星期${weekDay}`,
    });
  },

  async onShow() {
    await this.loadTasks();
  },

  async loadTasks() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ tasks: [], totalTasks: 0, doneTasks: 0 });
      return;
    }

    try {
      this.setData({ loading: true });
      const res = await taskApi.today(childId);
      const tasks = res.data || [];
      const done = tasks.filter((t: TaskItem) => t.status === 2).length;
      this.setData({ tasks, totalTasks: tasks.length, doneTasks: done });
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

  async onRefresh() {
    await this.loadTasks();
    wx.showToast({ title: '已刷新', icon: 'success' });
  },
});

interface IAppOption {
  globalData: {
    currentChildId: number;
  };
}
