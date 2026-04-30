import { authApi } from '../../api/auth';
import { childApi, ChildItem } from '../../api/child';
import { taskApi, TaskItem } from '../../api/task';

Page({
  data: {
    loading: false,
    children: [] as ChildItem[],
    currentChildId: 0,
    currentChild: null as ChildItem | null,
    todayTasks: [] as TaskItem[],
    todayTotal: 0,
    todayDone: 0,
    greeting: '',
  },

  async onLoad() {
    this.setGreeting();
    try {
      this.setData({ loading: true });
      await this.ensureLogin();
      await this.loadChildren();
      await this.loadTodayTasks();
    } catch (_e) {
      wx.showToast({ title: '初始化失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onShow() {
    if (this.data.currentChildId) {
      await this.loadChildren();
      await this.loadTodayTasks();
    }
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';
    if (hour < 6) greeting = '夜深了';
    else if (hour < 12) greeting = '早上好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    this.setData({ greeting });
  },

  async ensureLogin() {
    const app = getApp<IAppOption>();
    if (app.globalData.userId && app.globalData.token) {
      return;
    }

    const login = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>((resolve, reject) => {
      wx.login({ success: resolve, fail: reject });
    });

    const loginRes = await authApi.wechatLogin({
      code: login.code,
      nickname: '家长用户',
    });

    app.globalData.token = loginRes.data.token;
    app.globalData.userId = loginRes.data.user.id;
    wx.setStorageSync('token', loginRes.data.token);
    wx.setStorageSync('userId', loginRes.data.user.id);
  },

  async loadChildren() {
    const app = getApp<IAppOption>();
    try {
      const res = await childApi.list();
      const children = res.data || [];
      const currentId = app.globalData.currentChildId || (children[0]?._id ?? '');

      const currentChild = children.find((c: ChildItem) => c._id === currentId) || null;

      this.setData({ children, currentChildId: currentId, currentChild });

      if (app.globalData.currentChildId !== currentId) {
        app.globalData.currentChildId = currentId;
        wx.setStorageSync('currentChildId', currentId);
      }
    } catch (_e) {
      // 静默处理
    }
  },

  async loadTodayTasks() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ todayTasks: [], todayTotal: 0, todayDone: 0 });
      return;
    }

    try {
      const res = await taskApi.today(childId);
      const tasks = res.data || [];
      const done = tasks.filter((t: TaskItem) => t.status === 2).length;
      this.setData({ todayTasks: tasks, todayTotal: tasks.length, todayDone: done });
    } catch (_e) {
      this.setData({ todayTasks: [], todayTotal: 0, todayDone: 0 });
    }
  },

  onSelectChild(e: WechatMiniprogram.BaseEvent) {
    const childId = e.currentTarget.dataset.id || '';
    const app = getApp<IAppOption>();
    app.globalData.currentChildId = childId;
    wx.setStorageSync('currentChildId', childId);

    const currentChild = this.data.children.find(c => c._id === childId) || null;
    this.setData({ currentChildId: childId, currentChild });
    this.loadTodayTasks();
  },

  goAddChild() {
    wx.navigateTo({ url: '/pages/child/edit/index' });
  },

  goCreateHomework() {
    wx.navigateTo({ url: '/pages/homework/create/index' });
  },

  goWeeklyReport() {
    wx.navigateTo({ url: '/pages/report/weekly/index' });
  },

  goTaskSubmit(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/tasks/submit/index?taskId=${id}` });
  },
});

interface IAppOption {
  globalData: {
    token: string;
    userId: string;
    currentChildId: string;
  };
}
