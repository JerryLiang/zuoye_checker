const { authApi } = require('../../api/auth');
const { childApi } = require('../../api/child');
const { taskApi } = require('../../api/task');

Page({
  data: {
    loading: false,
    children: [],
    currentChildId: '',
    currentChild: null,
    todayTasks: [],
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
    var hour = new Date().getHours();
    var greeting = '晚上好';
    if (hour < 6) greeting = '夜深了';
    else if (hour < 12) greeting = '早上好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    this.setData({ greeting });
  },

  async ensureLogin() {
    var app = getApp();
    if (app.globalData.userId && app.globalData.token) {
      return;
    }

    var login = await new Promise(function (resolve, reject) {
      wx.login({ success: resolve, fail: reject });
    });

    var loginRes = await authApi.wechatLogin({
      code: login.code,
      nickname: '家长用户',
    });

    app.globalData.token = loginRes.data.token;
    app.globalData.userId = loginRes.data.user.id;
    wx.setStorageSync('token', loginRes.data.token);
    wx.setStorageSync('userId', loginRes.data.user.id);
  },

  async loadChildren() {
    var app = getApp();
    try {
      var res = await childApi.list();
      var children = res.data || [];
      var currentId = app.globalData.currentChildId || (children[0] && children[0]._id) || '';

      var currentChild = children.find(function (c) { return c._id === currentId; }) || null;

      this.setData({ children: children, currentChildId: currentId, currentChild: currentChild });

      if (app.globalData.currentChildId !== currentId) {
        app.globalData.currentChildId = currentId;
        wx.setStorageSync('currentChildId', currentId);
      }
    } catch (_e) {
      // 静默处理
    }
  },

  async loadTodayTasks() {
    var app = getApp();
    var childId = app.globalData.currentChildId;
    if (!childId) {
      this.setData({ todayTasks: [], todayTotal: 0, todayDone: 0 });
      return;
    }

    try {
      var res = await taskApi.today(childId);
      var tasks = res.data || [];
      var done = tasks.filter(function (t) { return t.status === 2; }).length;
      this.setData({ todayTasks: tasks, todayTotal: tasks.length, todayDone: done });
    } catch (_e) {
      this.setData({ todayTasks: [], todayTotal: 0, todayDone: 0 });
    }
  },

  onSelectChild(e) {
    var childId = e.currentTarget.dataset.id || '';
    var app = getApp();
    app.globalData.currentChildId = childId;
    wx.setStorageSync('currentChildId', childId);

    var currentChild = this.data.children.find(function (c) { return c._id === childId; }) || null;
    this.setData({ currentChildId: childId, currentChild: currentChild });
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

  goTaskSubmit(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/tasks/submit/index?taskId=' + id });
  },
});
