"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homework_1 = require("../../../api/homework");
const upload_1 = require("../../../api/upload");
Page({
    data: {
        subject: '语文',
        subjects: ['语文', '数学', '英语', '其他'],
        subjectIndex: 0,
        rawText: '',
        batchDate: '',
        submitting: false,
        inputMode: 'text',
        autoCheckMath: false,
        answerText: '',
        imagePath: '',
        fileAssetId: '',
        recognizing: false,
    },
    onLoad() {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.setData({ batchDate: date });
    },
    onModeChange(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ inputMode: mode });
    },
    onSubjectChange(e) {
        const idx = Number(e.detail.value);
        const subject = this.data.subjects[idx];
        this.setData({
            subjectIndex: idx,
            subject,
            autoCheckMath: subject === '数学' ? this.data.autoCheckMath : false,
            answerText: subject === '数学' ? this.data.answerText : '',
        });
    },
    onTextInput(e) {
        this.setData({ rawText: e.detail.value });
    },
    onAnswerInput(e) {
        this.setData({ answerText: e.detail.value });
    },
    onAutoCheckChange(e) {
        if (this.data.subject !== '数学') {
            wx.showToast({ title: '第一版仅支持数学批改', icon: 'none' });
            this.setData({ autoCheckMath: false, answerText: '' });
            return;
        }
        this.setData({ autoCheckMath: e.detail.value });
    },
    onDateChange(e) {
        this.setData({ batchDate: e.detail.value });
    },
    async chooseHomeworkImage() {
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
            this.setData({ imagePath: filePath, recognizing: true });
            const asset = await upload_1.uploadApi.upload(filePath, 'homework_input', app.globalData.currentChildId);
            this.setData({ fileAssetId: asset._id });
            const recognized = await homework_1.homeworkApi.recognizeImage(asset._id);
            if (recognized?.data) {
                const subjectIndex = this.data.subjects.indexOf(recognized.data.subject || this.data.subject);
                this.setData({
                    rawText: recognized.data.raw_text || this.data.rawText,
                    batchDate: recognized.data.batch_date || this.data.batchDate,
                    subject: subjectIndex >= 0 ? this.data.subjects[subjectIndex] : this.data.subject,
                    subjectIndex: subjectIndex >= 0 ? subjectIndex : this.data.subjectIndex,
                });
                if (recognized.data.provider_message) {
                    wx.showToast({ title: recognized.data.provider_message, icon: 'none' });
                }
            }
        }
        catch (e) {
            wx.showToast({ title: e instanceof Error ? e.message : '图片识别失败', icon: 'none' });
        }
        finally {
            this.setData({ recognizing: false });
        }
    },
    async onSubmit() {
        if (this.data.submitting || this.data.recognizing) {
            return;
        }
        const app = getApp();
        if (!app.globalData.currentChildId) {
            wx.showToast({ title: '请先添加孩子', icon: 'none' });
            wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
            return;
        }
        if (!this.data.rawText.trim()) {
            wx.showToast({ title: '请输入或识别作业内容', icon: 'none' });
            return;
        }
        if (this.data.autoCheckMath && !this.data.answerText.trim()) {
            wx.showToast({ title: '请输入数学答案', icon: 'none' });
            return;
        }
        try {
            this.setData({ submitting: true });
            await homework_1.homeworkApi.create({
                child_id: app.globalData.currentChildId,
                subject: this.data.subject,
                input_source: this.data.inputMode === 'photo' ? 2 : 1,
                raw_text: this.data.rawText,
                batch_date: this.data.batchDate,
                file_asset_id: this.data.fileAssetId || undefined,
                check_answers: this.data.autoCheckMath ? this.data.answerText : undefined,
            });
            wx.showToast({ title: '作业已创建', icon: 'success' });
            setTimeout(() => {
                wx.switchTab({ url: '/pages/index/index' });
            }, 800);
        }
        catch (_e) {
            wx.showToast({ title: '创建失败，请重试', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});
