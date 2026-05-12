import { childApi, ChildItem } from '../../../api/child';
import { taskApi, TaskItem } from '../../../api/task';
import { clearParentAuth, requireParentAuth } from '../../../utils/parentAuth';

Page({
  data: {
    loading: false,
    children: [] as ChildItem[],
    currentChildId: '',
    currentChild: null as ChildItem | null,
    todayTotal: 0,
    todayDone: 0,
  },

  async onShow() {
    if (!requireParentAuth('/pages/parent/home/index')) return;
    await this.loadData();
  },

  async loadData() {
    try {
      this.setData({ loading: true });
      const app = getApp<IAppOption>();
      const childRes = await childApi.list();
      const children = childRes.data || [];
      const savedId = app.globalData.currentChildId;
      const currentChildId = children.some((item: ChildItem) => item._id === savedId) ? savedId : (children[0]?._id || '');
      const currentChild = children.find((item: ChildItem) => item._id === currentChildId) || null;
      app.globalData.currentChildId = currentChildId;
      if (currentChildId) wx.setStorageSync('currentChildId', currentChildId);

      this.setData({ children, currentChildId, currentChild });
      await this.loadTodayTasks(currentChildId);
    } catch (e: any) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadTodayTasks(childId: string) {
    if (!childId) {
      this.setData({ todayTotal: 0, todayDone: 0 });
      return;
    }
    try {
      const res = await taskApi.today(childId);
      const tasks = res.data || [];
      this.setData({
        todayTotal: tasks.length,
        todayDone: tasks.filter((item: TaskItem) => item.status === 2).length,
      });
    } catch (_e) {
      this.setData({ todayTotal: 0, todayDone: 0 });
    }
  },

  onSelectChild(e: WechatMiniprogram.BaseEvent) {
    const childId = e.currentTarget.dataset.id || '';
    const app = getApp<IAppOption>();
    app.globalData.currentChildId = childId;
    wx.setStorageSync('currentChildId', childId);
    const currentChild = this.data.children.find(item => item._id === childId) || null;
    this.setData({ currentChildId: childId, currentChild });
    this.loadTodayTasks(childId);
  },

  goCreateHomework() {
    wx.navigateTo({ url: '/pages/homework/create/index' });
  },

  goWeeklyReport() {
    wx.navigateTo({ url: '/pages/report/weekly/index' });
  },

  goHomeworkHistory() {
    wx.navigateTo({ url: '/pages/homework/history/index?role=parent' });
  },

  goChildList() {
    wx.navigateTo({ url: '/pages/child/list/index' });
  },

  goAddChild() {
    wx.navigateTo({ url: '/pages/child/edit/index' });
  },

  goChildMode() {
    wx.setStorageSync('activeRole', 'child');
    wx.switchTab({ url: '/pages/index/index' });
  },

  logoutParent() {
    clearParentAuth();
    wx.showToast({ title: '已退出家长端', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/profile/index' }), 350);
  },
});

interface IAppOption {
  globalData: {
    currentChildId: string;
  };
}
