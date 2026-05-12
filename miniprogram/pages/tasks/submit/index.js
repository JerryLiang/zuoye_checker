"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_1 = require("../../../api/task");
const upload_1 = require("../../../api/upload");
Page({
    data: {
        taskId: '',
        task: null,
        text: '',
        submitting: false,
        uploading: false,
        loading: false,
        submitMode: 'text',
        imagePath: '',
        fileAssetId: '',
        readOnly: false,
        role: 'child',
        statusText: '',
    },
    async onLoad(query) {
        const role = query.role === 'parent' ? 'parent' : 'child';
        const readOnly = query.mode === 'view' || role === 'parent';
        this.setData({ taskId: query.taskId || '', readOnly, role });
        await this.loadTask();
    },
    async loadTask() {
        const app = getApp();
        const childId = app.globalData.currentChildId;
        if (!this.data.taskId || !childId)
            return;
        try {
            this.setData({ loading: true });
            const res = await task_1.taskApi.get(this.data.taskId, childId);
            const task = res.data;
            const submission = task.submission;
            const nextMode = submission?.file_asset_id ? 'photo' : 'text';
            const nextReadOnly = this.data.readOnly || task.status === 2;
            this.setData({
                task,
                readOnly: nextReadOnly,
                statusText: this.getStatusText(task.status),
                text: submission?.submit_text || '',
                submitMode: nextMode,
                fileAssetId: submission?.file_asset_id || '',
            });
        }
        catch (e) {
            wx.showToast({ title: e instanceof Error ? e.message : '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    getStatusText(status) {
        return status === 2 ? '已完成' : (status === 3 ? '已提交，等待家长检查' : '待完成');
    },
    onModeChange(e) {
        if (this.data.readOnly)
            return;
        const mode = e.currentTarget.dataset.mode;
        this.setData({ submitMode: mode });
    },
    onTextInput(e) {
        if (this.data.readOnly)
            return;
        this.setData({ text: e.detail.value });
    },
    async chooseSubmitImage() {
        if (this.data.readOnly)
            return;
        const app = getApp();
        if (!app.globalData.currentChildId) {
            wx.showToast({ title: '请先添加学生', icon: 'none' });
            wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
            return;
        }
        try {
            const imageRes = await wx.chooseMedia({
                count: 1,
                mediaType: ['image'],
                sourceType: ['album', 'camera'],
            });
            const filePath = imageRes.tempFiles[0]?.tempFilePath;
            if (!filePath)
                return;
            this.setData({ imagePath: filePath, uploading: true });
            const asset = await upload_1.uploadApi.upload(filePath, 'task_submission', app.globalData.currentChildId);
            this.setData({ fileAssetId: asset._id });
            wx.showToast({ title: '图片已上传', icon: 'success' });
        }
        catch (e) {
            wx.showToast({ title: e instanceof Error ? e.message : '上传失败', icon: 'none' });
        }
        finally {
            this.setData({ uploading: false });
        }
    },
    async onSubmit() {
        if (this.data.readOnly || this.data.submitting || this.data.uploading)
            return;
        const app = getApp();
        if (!app.globalData.currentChildId) {
            wx.showToast({ title: '请先添加学生', icon: 'none' });
            wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
            return;
        }
        if (!this.data.taskId) {
            wx.showToast({ title: '参数错误', icon: 'none' });
            return;
        }
        const hasText = !!this.data.text.trim();
        const hasImage = !!this.data.fileAssetId;
        if (!hasText && !hasImage) {
            wx.showToast({ title: '请输入答案/描述，或拍照上传', icon: 'none' });
            return;
        }
        try {
            this.setData({ submitting: true });
            await task_1.taskApi.submit(this.data.taskId, {
                child_id: app.globalData.currentChildId,
                submit_type: hasImage ? 2 : 1,
                submit_text: hasText ? this.data.text.trim() : undefined,
                file_asset_id: hasImage ? this.data.fileAssetId : undefined,
            });
            wx.showModal({
                title: '提交成功',
                content: '状态已更新，等待爸爸妈妈检查',
                showCancel: false,
                success: () => wx.navigateBack(),
            });
        }
        catch (e) {
            wx.showToast({ title: e instanceof Error ? e.message : '提交失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});
