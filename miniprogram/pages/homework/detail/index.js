"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homework_1 = require("../../../api/homework");
const parentAuth_1 = require("../../../utils/parentAuth");
Page({
    data: {
        batch: null,
        tasks: [],
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
    async loadDetail(id) {
        try {
            this.setData({ loading: true });
            const res = await homework_1.homeworkApi.get(id);
            const batch = res.data;
            const tasks = batch.tasks || [];
            const doneCount = tasks.filter((t) => t.status === 2).length;
            const totalCount = tasks.length;
            const progressPct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
            this.setData({ batch, tasks, doneCount, totalCount, progressPct });
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
        wx.navigateTo({ url: `/pages/tasks/submit/index?taskId=${id}` });
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
