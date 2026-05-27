"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_1 = require("../../../api/child");
const task_1 = require("../../../api/task");
const parentAuth_1 = require("../../../utils/parentAuth");
Page({
    data: {
        loading: false,
        children: [],
        currentChildId: '',
        currentChild: null,
        todayTotal: 0,
        todaySubmitted: 0,
        todayDone: 0,
    },
    async onShow() {
        if (!(0, parentAuth_1.requireParentAuth)('/pages/parent/home/index'))
            return;
        await this.loadData();
    },
    async loadData() {
        try {
            this.setData({ loading: true });
            const app = getApp();
            const childRes = await child_1.childApi.list();
            const children = childRes.data || [];
            const savedId = app.globalData.currentChildId;
            const currentChildId = children.some((item) => item._id === savedId)
                ? savedId
                : children[0]?._id || '';
            const currentChild = children.find((item) => item._id === currentChildId) || null;
            app.globalData.currentChildId = currentChildId;
            if (currentChildId)
                wx.setStorageSync('currentChildId', currentChildId);
            this.setData({ children, currentChildId, currentChild });
            await this.loadTodayTasks(currentChildId);
        }
        catch (e) {
            wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadTodayTasks(childId) {
        if (!childId) {
            this.setData({ todayTotal: 0, todaySubmitted: 0, todayDone: 0 });
            return;
        }
        try {
            const res = await task_1.taskApi.today(childId);
            const tasks = res.data || [];
            const submitted = tasks.filter((item) => item.status === 3).length;
            this.setData({
                todayTotal: tasks.length,
                todaySubmitted: submitted,
                todayDone: tasks.filter((item) => item.status === 2).length,
            });
        }
        catch (_e) {
            this.setData({ todayTotal: 0, todaySubmitted: 0, todayDone: 0 });
        }
    },
    onSelectChild(e) {
        const childId = e.currentTarget.dataset.id || '';
        const app = getApp();
        app.globalData.currentChildId = childId;
        wx.setStorageSync('currentChildId', childId);
        const currentChild = this.data.children.find((item) => item._id === childId) || null;
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
    goTodayTasks() {
        wx.setStorageSync('activeRole', 'parent');
        wx.switchTab({ url: '/pages/tasks/today/index' });
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
        (0, parentAuth_1.clearParentAuth)();
        wx.showToast({ title: '已退出家长端', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/profile/index' }), 350);
    },
});
