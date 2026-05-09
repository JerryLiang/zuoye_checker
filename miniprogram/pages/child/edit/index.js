"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_1 = require("../../../api/child");
const parentAuth_1 = require("../../../utils/parentAuth");
Page({
    data: {
        editId: '',
        name: '',
        ageGroup: '3-6',
        ageIndex: 0,
        grade: '',
        isEdit: false,
        isOnboarding: false,
    },
    onLoad(options) {
        const redirect = options.id ? `/pages/child/edit/index?id=${options.id}` : '/pages/child/edit/index';
        if (!(0, parentAuth_1.requireParentAuth)(redirect))
            return;
        if (options.mode === 'onboarding') {
            this.setData({ isOnboarding: true });
            wx.setNavigationBarTitle({ title: '添加第一个孩子' });
            wx.hideHomeButton?.();
        }
        if (options.id) {
            const id = options.id;
            this.setData({ editId: id, isEdit: true, isOnboarding: false });
            wx.setNavigationBarTitle({ title: '编辑孩子' });
            this.loadChild(id);
        }
    },
    async loadChild(id) {
        try {
            const res = await child_1.childApi.get(id);
            const child = res.data;
            const groups = ['3-6', '7-9', '10-12'];
            this.setData({
                name: child.name,
                ageGroup: child.age_group,
                ageIndex: groups.indexOf(child.age_group),
                grade: child.grade || '',
            });
        }
        catch (_e) {
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
    },
    onNameInput(e) {
        this.setData({ name: e.detail.value });
    },
    onGradeInput(e) {
        this.setData({ grade: e.detail.value });
    },
    onAgeChange(e) {
        const map = ['3-6', '7-9', '10-12'];
        const idx = Number(e.detail.value);
        this.setData({ ageGroup: map[idx], ageIndex: idx });
    },
    async onSubmit() {
        if (!this.data.name.trim()) {
            wx.showToast({ title: '请输入姓名', icon: 'none' });
            return;
        }
        try {
            if (this.data.isEdit) {
                await child_1.childApi.update(this.data.editId, {
                    name: this.data.name.trim(),
                    age_group: this.data.ageGroup,
                    grade: this.data.grade,
                });
                wx.showToast({ title: '保存成功', icon: 'success' });
                setTimeout(() => wx.navigateBack(), 500);
            }
            else {
                const res = await child_1.childApi.create({
                    name: this.data.name.trim(),
                    age_group: this.data.ageGroup,
                    grade: this.data.grade,
                });
                const childId = res.data._id;
                const app = getApp();
                app.globalData.currentChildId = childId;
                wx.setStorageSync('currentChildId', childId);
                wx.showToast({ title: '添加成功', icon: 'success' });
                setTimeout(() => {
                    if (this.data.isOnboarding) {
                        wx.switchTab({ url: '/pages/index/index' });
                    }
                    else {
                        wx.navigateBack();
                    }
                }, 500);
            }
        }
        catch (e) {
            console.error('保存孩子失败', e);
            wx.showToast({ title: e?.message || '操作失败', icon: 'none' });
        }
    },
});
