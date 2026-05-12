"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_1 = require("../../../api/task");
Page({
    data: {
        tasks: [],
        totalTasks: 0,
        doneTasks: 0,
        loading: false,
        currentDate: '',
        canManage: false,
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
        const canManage = wx.getStorageSync('activeRole') === 'parent';
        this.setData({ canManage });
        await this.loadTasks();
    },
    async loadTasks() {
        const app = getApp();
        const childId = app.globalData.currentChildId;
        if (!childId) {
            this.setData({ tasks: [], totalTasks: 0, doneTasks: 0 });
            wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
            return;
        }
        try {
            this.setData({ loading: true });
            const res = await task_1.taskApi.today(childId);
            const tasks = res.data || [];
            const done = tasks.filter((t) => t.status === 2).length;
            this.setData({ tasks, totalTasks: tasks.length, doneTasks: done });
        }
        catch (_e) {
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goSubmit(e) {
        const id = e.currentTarget.dataset.id;
        const status = Number(e.currentTarget.dataset.status || 1);
        const role = this.data.canManage ? 'parent' : 'child';
        const mode = this.data.canManage || status === 2 ? 'view' : 'edit';
        wx.navigateTo({ url: `/pages/tasks/submit/index?taskId=${id}&mode=${mode}&role=${role}` });
    },
    async onDeleteTask(e) {
        if (!this.data.canManage)
            return;
        const taskId = e.currentTarget.dataset.id;
        const app = getApp();
        const childId = app.globalData.currentChildId;
        if (!taskId || !childId)
            return;
        const res = await wx.showModal({
            title: '确认删除任务',
            content: '只能删除学生未提交的任务，删除后不可恢复。',
        });
        if (!res.confirm)
            return;
        try {
            await task_1.taskApi.remove(taskId, childId);
            wx.showToast({ title: '已删除', icon: 'success' });
            await this.loadTasks();
        }
        catch (e) {
            wx.showToast({ title: e?.message || '删除失败', icon: 'none' });
        }
    },
    async onRefresh() {
        await this.loadTasks();
        wx.showToast({ title: '已刷新', icon: 'success' });
    },
});
