"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_1 = require("../../../api/task");
const upload_1 = require("../../../api/upload");
Page({
    data: {
        taskId: '',
        text: '',
        submitting: false,
        uploading: false,
        submitMode: 'text',
        imagePath: '',
        fileAssetId: '',
    },
    onLoad(query) {
        this.setData({ taskId: query.taskId || '' });
    },
    onModeChange(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ submitMode: mode });
    },
    onTextInput(e) {
        this.setData({ text: e.detail.value });
    },
    async chooseSubmitImage() {
        const app = getApp();
        if (!app.globalData.currentChildId) {
            wx.showToast({ title: '请先添加孩子', icon: 'none' });
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
        if (this.data.submitting || this.data.uploading)
            return;
        const app = getApp();
        if (!app.globalData.currentChildId) {
            wx.showToast({ title: '请先添加孩子', icon: 'none' });
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
            const res = await task_1.taskApi.submit(this.data.taskId, {
                child_id: app.globalData.currentChildId,
                submit_type: hasImage ? 2 : 1,
                submit_text: hasText ? this.data.text.trim() : undefined,
                file_asset_id: hasImage ? this.data.fileAssetId : undefined,
            });
            const checkResult = res.data?.check_result || {};
            const score = checkResult.score ?? 0;
            const passed = !!checkResult.is_passed;
            const feedback = checkResult.feedback || (passed ? '完成得不错，继续加油！' : '再补充一点内容就更好了。');
            wx.showModal({
                title: passed ? '太棒了！' : '继续加油',
                content: `评分：${score}分\n${feedback}${passed ? '\n任务已完成，积分 +2' : '\n请补充内容后再次提交'}`,
                showCancel: false,
                success: () => {
                    if (passed) {
                        wx.navigateBack();
                    }
                },
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
