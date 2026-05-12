"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homework_1 = require("../../../api/homework");
const task_1 = require("../../../api/task");
const parentAuth_1 = require("../../../utils/parentAuth");
Page({
    data: {
        batch: null,
        tasks: [],
        subjectGroups: [],
        loading: true,
        batchId: '',
        doneCount: 0,
        totalCount: 0,
        progressPct: 0,
        canManage: false,
    },
    onLoad(options) {
        const canManage = options.role === 'parent';
        const redirect = options.id ? `/pages/homework/detail/index?id=${options.id}&role=parent` : '/pages/parent/home/index';
        if (canManage && !(0, parentAuth_1.requireParentAuth)(redirect))
            return;
        if (options.id) {
            this.setData({ batchId: options.id, canManage });
            this.loadDetail(options.id);
        }
    },
    async onShow() {
        if (this.data.batchId) {
            await this.loadDetail(this.data.batchId);
        }
    },
    async loadDetail(id) {
        try {
            this.setData({ loading: true });
            const res = await homework_1.homeworkApi.get(id);
            const batch = res.data;
            const tasks = batch.tasks || [];
            const subjectGroups = this.buildSubjectGroups(tasks);
            const doneCount = tasks.filter((t) => t.status === 2).length;
            const totalCount = tasks.length;
            const progressPct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
            this.setData({ batch, tasks, subjectGroups, doneCount, totalCount, progressPct });
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
        const mode = this.data.canManage || status === 2 ? 'view' : 'edit';
        const role = this.data.canManage ? 'parent' : 'child';
        wx.navigateTo({ url: `/pages/tasks/submit/index?taskId=${id}&mode=${mode}&role=${role}` });
    },
    buildSubjectGroups(tasks) {
        const groups = [];
        tasks.forEach(task => {
            const subject = task.subject || '其他';
            let group = groups.find(item => item.subject === subject);
            if (!group) {
                group = { subject, tasks: [] };
                groups.push(group);
            }
            group.tasks.push(task);
        });
        return groups;
    },
    noop() { },
    async onApproveTask(e) {
        if (!this.data.canManage)
            return;
        const taskId = e.currentTarget.dataset.id;
        if (!taskId || !this.data.batch?.child_id)
            return;
        const res = await wx.showModal({
            title: '确认检查通过',
            content: '检查通过后任务会变为已完成，并发放奖励积分。',
        });
        if (!res.confirm)
            return;
        try {
            await task_1.taskApi.review(taskId, { child_id: this.data.batch.child_id, approved: true });
            wx.showToast({ title: '已完成并发放积分', icon: 'success' });
            await this.loadDetail(this.data.batchId);
        }
        catch (e) {
            wx.showToast({ title: e?.message || '检查失败', icon: 'none' });
        }
    },
    async onDeleteBatch() {
        const redirect = this.data.batchId ? `/pages/homework/detail/index?id=${this.data.batchId}&role=parent` : '/pages/parent/home/index';
        if (!(0, parentAuth_1.requireParentAuth)(redirect))
            return;
        const res = await wx.showModal({
            title: '确认删除',
            content: '删除后不可恢复，确认删除这批作业吗？',
        });
        if (!res.confirm)
            return;
        try {
            await homework_1.homeworkApi.remove(this.data.batchId);
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 500);
        }
        catch (_e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
        }
    },
    async onRefresh() {
        await this.loadDetail(this.data.batchId);
        wx.showToast({ title: '已刷新', icon: 'success' });
    },
});
