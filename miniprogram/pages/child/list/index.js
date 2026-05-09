"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_1 = require("../../../api/child");
Page({
    data: {
        children: [],
        currentChildId: '',
        loading: true,
    },
    onShow() {
        const app = getApp();
        this.setData({ currentChildId: app.globalData.currentChildId });
        this.loadChildren();
    },
    async loadChildren() {
        try {
            this.setData({ loading: true });
            const res = await child_1.childApi.list();
            const children = res.data || [];
            const app = getApp();
            const currentChildId = children.some((child) => child._id === app.globalData.currentChildId)
                ? app.globalData.currentChildId
                : '';
            if (!currentChildId) {
                app.globalData.currentChildId = '';
                wx.removeStorageSync('currentChildId');
            }
            this.setData({ children, currentChildId });
        }
        catch (_e) {
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goAdd() {
        wx.navigateTo({ url: '/pages/child/edit/index' });
    },
    goEdit(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/child/edit/index?id=${id}` });
    },
    async onDelete(e) {
        const id = e.currentTarget.dataset.id;
        const child = this.data.children.find((c) => c._id === id);
        const res = await wx.showModal({
            title: '确认删除',
            content: `确定要删除「${child?.name || ''}」吗？`,
        });
        if (!res.confirm)
            return;
        try {
            await child_1.childApi.remove(id);
            const app = getApp();
            if (app.globalData.currentChildId === id) {
                app.globalData.currentChildId = '';
                wx.removeStorageSync('currentChildId');
            }
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadChildren();
        }
        catch (_e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
        }
    },
    onSelectChild(e) {
        const id = e.currentTarget.dataset.id;
        const app = getApp();
        app.globalData.currentChildId = id;
        wx.setStorageSync('currentChildId', id);
        this.setData({ currentChildId: id });
        wx.showToast({ title: '已切换', icon: 'success' });
    },
});
