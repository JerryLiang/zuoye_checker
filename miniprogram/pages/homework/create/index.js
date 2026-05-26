"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homework_1 = require("../../../api/homework");
const upload_1 = require("../../../api/upload");
const parentAuth_1 = require("../../../utils/parentAuth");
Page({
    data: {
        subject: '语文',
        subjects: ['语文', '数学', '英语', '其他'],
        subjectIndex: 0,
        rawText: '',
        homeworkItems: [{ text: '' }],
        recognizedItems: [],
        batchDate: '',
        submitting: false,
        inputMode: 'text',
        autoCheckMath: false,
        answerText: '',
        imagePaths: [],
        fileAssetIds: [],
        uploading: false,
        recognizing: false,
        canvasWidth: 300,
        canvasHeight: 300,
    },
    onLoad() {
        if (!(0, parentAuth_1.requireParentAuth)('/pages/homework/create/index'))
            return;
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
    onTaskInput(e) {
        const index = Number(e.currentTarget.dataset.index);
        const homeworkItems = this.data.homeworkItems.slice();
        homeworkItems[index] = { ...homeworkItems[index], text: e.detail.value };
        this.updateHomeworkItems(homeworkItems);
    },
    addHomeworkItem() {
        const homeworkItems = this.data.homeworkItems.concat({ text: '' });
        this.updateHomeworkItems(homeworkItems);
    },
    removeHomeworkItem(e) {
        const index = Number(e.currentTarget.dataset.index);
        const homeworkItems = this.data.homeworkItems.filter((_item, idx) => idx !== index);
        this.updateHomeworkItems(homeworkItems.length > 0 ? homeworkItems : [{ text: '' }]);
    },
    updateHomeworkItems(homeworkItems) {
        const rawText = homeworkItems
            .map((item) => item.text.trim())
            .filter(Boolean)
            .join('\n');
        this.setData({ homeworkItems, rawText });
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
            wx.showToast({ title: '请先添加学生', icon: 'none' });
            wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
            return;
        }
        const remaining = 5 - this.data.imagePaths.length;
        if (remaining <= 0) {
            wx.showToast({ title: '一天作业最多上传5张', icon: 'none' });
            return;
        }
        try {
            const imageRes = await wx.chooseMedia({
                count: remaining,
                mediaType: ['image'],
                sourceType: ['album', 'camera'],
                sizeType: ['compressed'],
            });
            const tempFiles = imageRes.tempFiles || [];
            if (tempFiles.length === 0)
                return;
            const oversized = tempFiles.find((file) => (file.size || 0) > 10 * 1024 * 1024);
            if (oversized) {
                wx.showToast({ title: '单张图片不能超过10M', icon: 'none' });
                return;
            }
            this.setData({ uploading: true });
            const imagePaths = this.data.imagePaths.slice();
            const fileAssetIds = this.data.fileAssetIds.slice();
            for (let i = 0; i < tempFiles.length; i++) {
                const filePath = tempFiles[i]?.tempFilePath;
                if (!filePath)
                    continue;
                const uploadPath = await this.compressImageForRecognition(filePath);
                imagePaths.push(uploadPath);
                this.setData({ imagePaths });
                const asset = await upload_1.uploadApi.upload(uploadPath, 'homework_input', app.globalData.currentChildId);
                fileAssetIds.push(asset._id);
                this.setData({ fileAssetIds });
            }
            wx.showToast({ title: '图片已上传，请点击识别', icon: 'success' });
        }
        catch (e) {
            console.error('图片上传失败', e);
            wx.showToast({ title: e instanceof Error ? e.message : '图片上传失败', icon: 'none' });
        }
        finally {
            this.setData({ uploading: false });
        }
    },
    async recognizeUploadedImages() {
        if (this.data.recognizing || this.data.uploading)
            return;
        if (this.data.fileAssetIds.length === 0) {
            wx.showToast({ title: '请先上传图片', icon: 'none' });
            return;
        }
        try {
            this.setData({ recognizing: true });
            const allRecognizedItems = [];
            let batchDate = this.data.batchDate;
            let subject = this.data.subject;
            let subjectIndex = this.data.subjectIndex;
            let providerMessage = '';
            for (let i = 0; i < this.data.fileAssetIds.length; i++) {
                const recognized = await homework_1.homeworkApi.recognizeImage(this.data.fileAssetIds[i]);
                if (recognized?.data) {
                    const nextSubjectIndex = this.data.subjects.indexOf(recognized.data.subject || subject);
                    if (nextSubjectIndex >= 0 && allRecognizedItems.length === 0) {
                        subject = this.data.subjects[nextSubjectIndex];
                        subjectIndex = nextSubjectIndex;
                    }
                    const recognizedItems = this.buildRecognizedItems(recognized.data.recognized_items, recognized.data.raw_text, subject);
                    allRecognizedItems.push(...recognizedItems);
                    batchDate = recognized.data.batch_date || batchDate;
                    providerMessage = recognized.data.provider_message || providerMessage;
                }
            }
            const rawText = allRecognizedItems.map((item) => item.text).join('\n');
            this.setData({
                rawText,
                recognizedItems: allRecognizedItems,
                batchDate,
                subject,
                subjectIndex,
            });
            if (providerMessage) {
                wx.showToast({ title: providerMessage, icon: 'none' });
            }
            else if (allRecognizedItems.length > 0) {
                wx.showToast({ title: '识别完成，可手动修改后提交', icon: 'success' });
            }
            else {
                wx.showToast({ title: '未识别到内容，请重试或换图', icon: 'none' });
            }
        }
        catch (e) {
            console.error('图片识别失败', e);
            wx.showToast({ title: e instanceof Error ? e.message : '图片识别失败', icon: 'none' });
        }
        finally {
            this.setData({ recognizing: false });
        }
    },
    onRecognizedTextInput(e) {
        const index = Number(e.currentTarget.dataset.index);
        const recognizedItems = this.data.recognizedItems.slice();
        if (!recognizedItems[index])
            return;
        recognizedItems[index] = { ...recognizedItems[index], text: e.detail.value };
        this.setData({
            recognizedItems,
            rawText: recognizedItems
                .map((item) => item.text.trim())
                .filter(Boolean)
                .join('\n'),
        });
    },
    onRecognizedSubjectChange(e) {
        const index = Number(e.currentTarget.dataset.index);
        const subjectIndex = Number(e.detail.value);
        const recognizedItems = this.data.recognizedItems.slice();
        if (!recognizedItems[index])
            return;
        recognizedItems[index] = { ...recognizedItems[index], subject: this.data.subjects[subjectIndex] };
        this.setData({ recognizedItems });
    },
    removeHomeworkImage(e) {
        const index = Number(e.currentTarget.dataset.index);
        const imagePaths = this.data.imagePaths.filter((_item, idx) => idx !== index);
        const fileAssetIds = this.data.fileAssetIds.filter((_item, idx) => idx !== index);
        this.setData({ imagePaths, fileAssetIds });
    },
    async compressImageForRecognition(filePath) {
        const maxBytes = 700 * 1024;
        const getSize = async (path) => {
            const info = await wx.getFileInfo({ filePath: path });
            return info.size || 0;
        };
        let currentPath = filePath;
        let currentSize = await getSize(currentPath);
        if (currentSize <= maxBytes)
            return currentPath;
        const imageInfo = await wx.getImageInfo({ src: currentPath });
        const maxWidths = [1800, 1600, 1400, 1200, 1000, 900];
        const qualities = [0.82, 0.76, 0.7, 0.64, 0.58, 0.52];
        for (const maxWidth of maxWidths) {
            const scale = Math.min(1, maxWidth / Math.max(imageInfo.width, imageInfo.height));
            const targetWidth = Math.max(1, Math.round(imageInfo.width * scale));
            const targetHeight = Math.max(1, Math.round(imageInfo.height * scale));
            this.setData({ canvasWidth: targetWidth, canvasHeight: targetHeight });
            for (const quality of qualities) {
                currentPath = await this.drawImageToJpeg(currentPath, targetWidth, targetHeight, quality);
                currentSize = await getSize(currentPath);
                if (currentSize <= maxBytes)
                    return currentPath;
            }
        }
        const compressed = await wx.compressImage({ src: currentPath, quality: 40 });
        return compressed.tempFilePath;
    },
    drawImageToJpeg(filePath, width, height, quality) {
        return new Promise((resolve, reject) => {
            const ctx = wx.createCanvasContext('compressCanvas', this);
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(filePath, 0, 0, width, height);
            ctx.draw(false, () => {
                wx.canvasToTempFilePath({
                    canvasId: 'compressCanvas',
                    destWidth: width,
                    destHeight: height,
                    fileType: 'jpg',
                    quality,
                    success: (res) => resolve(res.tempFilePath),
                    fail: reject,
                }, this);
            });
        });
    },
    buildRecognizedItems(items, rawText = '', fallbackSubject) {
        if (Array.isArray(items) && items.length > 0) {
            return items
                .map((item) => ({
                subject: this.normalizeSubject(item.subject || fallbackSubject),
                text: String(item.text || '').trim(),
            }))
                .filter((item) => item.text);
        }
        return String(rawText || '')
            .split(/[\n\r]+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((text) => ({ subject: fallbackSubject, text }));
    },
    normalizeSubject(subject = '其他') {
        return this.data.subjects.includes(subject) ? subject : '其他';
    },
    getSubmitItems() {
        const sourceItems = this.data.inputMode === 'photo'
            ? this.data.recognizedItems
            : this.data.homeworkItems.map((item) => ({ subject: this.data.subject, text: item.text }));
        return sourceItems
            .map((item) => ({
            subject: this.normalizeSubject(item.subject || this.data.subject),
            text: String(item.text || '').trim(),
        }))
            .filter((item) => item.text);
    },
    async onSubmit() {
        if (this.data.submitting || this.data.uploading || this.data.recognizing) {
            return;
        }
        const app = getApp();
        if (!app.globalData.currentChildId) {
            wx.showToast({ title: '请先添加学生', icon: 'none' });
            wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
            return;
        }
        const submitItems = this.getSubmitItems();
        if (submitItems.length === 0) {
            wx.showToast({
                title: this.data.inputMode === 'photo' ? '请先上传图片并点击识别' : '请输入作业内容',
                icon: 'none',
            });
            return;
        }
        if (this.data.autoCheckMath && !this.data.answerText.trim()) {
            wx.showToast({ title: '请输入数学答案', icon: 'none' });
            return;
        }
        try {
            this.setData({ submitting: true });
            const subjects = submitItems.map((item) => item.subject).filter(Boolean);
            const uniqueSubjects = subjects.filter((subject, index) => subjects.indexOf(subject) === index);
            await homework_1.homeworkApi.create({
                child_id: app.globalData.currentChildId,
                subject: uniqueSubjects.length === 1 ? uniqueSubjects[0] : '其他',
                input_source: this.data.inputMode === 'photo' ? 2 : 1,
                raw_text: submitItems.map((item) => item.text).join('\n'),
                task_items: submitItems,
                batch_date: this.data.batchDate,
                file_asset_id: this.data.fileAssetIds[0] || undefined,
                file_asset_ids: this.data.fileAssetIds.length > 0 ? this.data.fileAssetIds : undefined,
                check_answers: this.data.autoCheckMath ? this.data.answerText : undefined,
            });
            wx.showToast({ title: '作业已创建', icon: 'success' });
            setTimeout(() => {
                wx.switchTab({ url: '/pages/index/index' });
            }, 800);
        }
        catch (e) {
            console.error('创建作业失败', e);
            wx.showToast({ title: e?.message || '创建失败，请重试', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});
