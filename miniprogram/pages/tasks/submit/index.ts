import { taskApi, TaskItem } from '../../../api/task';
import { uploadApi } from '../../../api/upload';

Page({
  data: {
    taskId: '',
    task: null as TaskItem | null,
    text: '',
    submitting: false,
    uploading: false,
    loading: false,
    submitMode: 'text' as 'text' | 'photo',
    imagePath: '',
    fileAssetId: '',
    readOnly: false,
    role: 'child' as 'child' | 'parent',
    statusText: '',
    canApprove: false,
    approving: false,
    attachmentFileID: '',
    attachmentName: '',
    attachmentExt: '',
    attachmentSizeText: '',
    attachmentIsImage: false,
    attachmentIsAudio: false,
    attachmentIsPdf: false,
    playingAudio: false,
  },

  async onLoad(query: Record<string, string>) {
    const role = query.role === 'parent' ? 'parent' : 'child';
    const readOnly = query.mode === 'view';
    this.setData({ taskId: query.taskId || '', readOnly, role });
    await this.loadTask();
  },

  async loadTask() {
    const app = getApp<IAppOption>();
    const childId = app.globalData.currentChildId;
    if (!this.data.taskId || !childId) return;

    try {
      this.setData({ loading: true });
      const res = await taskApi.get(this.data.taskId, childId);
      const task = res.data as TaskItem;
      const submission = task.submission;
      const fileAsset = submission?.file_asset || null;
      const attachmentExt = String(fileAsset?.file_ext || '').toLowerCase();
      const nextMode = submission?.file_asset_id ? 'photo' : 'text';
      const nextReadOnly = this.data.readOnly || task.status === 2;
      const canApprove = this.data.role === 'parent' && task.status === 3;
      this.setData({
        task,
        readOnly: nextReadOnly,
        canApprove,
        statusText: this.getStatusText(task.status),
        text: submission?.submit_text || '',
        submitMode: nextMode,
        fileAssetId: submission?.file_asset_id || '',
        attachmentFileID: fileAsset?.fileID || '',
        attachmentName: fileAsset?.file_name || (attachmentExt ? `提交附件.${attachmentExt}` : '提交附件'),
        attachmentExt,
        attachmentSizeText: this.formatFileSize(fileAsset?.file_size || 0),
        attachmentIsImage: ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(attachmentExt),
        attachmentIsAudio: ['mp3', 'm4a', 'aac', 'wav'].includes(attachmentExt),
        attachmentIsPdf: attachmentExt === 'pdf',
      });
    } catch (e) {
      wx.showToast({ title: e instanceof Error ? e.message : '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  getStatusText(status: 1 | 2 | 3) {
    return status === 2 ? '已完成' : status === 3 ? '已提交，等待家长检查' : '待完成';
  },

  formatFileSize(size: number) {
    if (!size) return '';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  },

  async getAttachmentTempUrl() {
    if (!this.data.attachmentFileID) return '';
    const res = await wx.cloud.getTempFileURL({ fileList: [this.data.attachmentFileID] });
    return res.fileList[0]?.tempFileURL || '';
  },

  async onPreviewAttachment() {
    if (!this.data.attachmentFileID) return;
    try {
      if (this.data.attachmentIsImage) {
        const url = await this.getAttachmentTempUrl();
        if (!url) throw new Error('获取图片地址失败');
        wx.previewImage({ urls: [url], current: url });
        return;
      }

      const downloadRes = await wx.cloud.downloadFile({ fileID: this.data.attachmentFileID });
      if (this.data.attachmentIsAudio) {
        const audio = wx.createInnerAudioContext();
        audio.src = downloadRes.tempFilePath;
        audio.onEnded(() => this.setData({ playingAudio: false }));
        audio.onError(() => this.setData({ playingAudio: false }));
        this.setData({ playingAudio: true });
        audio.play();
        return;
      }

      wx.openDocument({ filePath: downloadRes.tempFilePath, showMenu: true });
    } catch (e) {
      wx.showToast({ title: e instanceof Error ? e.message : '预览失败', icon: 'none' });
    }
  },

  async onDownloadAttachment() {
    if (!this.data.attachmentFileID) return;
    try {
      wx.showLoading({ title: '下载中' });
      const downloadRes = await wx.cloud.downloadFile({ fileID: this.data.attachmentFileID });
      if (this.data.attachmentIsImage) {
        await wx.saveImageToPhotosAlbum({ filePath: downloadRes.tempFilePath });
        wx.showToast({ title: '已保存到相册', icon: 'success' });
        return;
      }

      const saveRes = await (wx as any).saveFile({ tempFilePath: downloadRes.tempFilePath });
      wx.showModal({ title: '已下载', content: `文件已保存到本机：${saveRes.savedFilePath}`, showCancel: false });
    } catch (e) {
      wx.showToast({ title: e instanceof Error ? e.message : '下载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onModeChange(e: WechatMiniprogram.BaseEvent) {
    if (this.data.readOnly) return;
    const mode = e.currentTarget.dataset.mode as 'text' | 'photo';
    this.setData({ submitMode: mode });
  },

  onTextInput(e: WechatMiniprogram.TextareaInput) {
    if (this.data.readOnly) return;
    this.setData({ text: e.detail.value });
  },

  async chooseSubmitImage() {
    if (this.data.readOnly) return;
    const app = getApp<IAppOption>();
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
      if (!filePath) return;

      this.setData({ imagePath: filePath, uploading: true });
      const asset = await uploadApi.upload(filePath, 'task_submission', app.globalData.currentChildId);
      this.setData({ fileAssetId: asset._id });
      wx.showToast({ title: '图片已上传', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e instanceof Error ? e.message : '上传失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  },

  async onSubmit() {
    if (this.data.readOnly || this.data.submitting || this.data.uploading) return;

    const app = getApp<IAppOption>();
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
      await taskApi.submit(this.data.taskId, {
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
    } catch (e) {
      wx.showToast({ title: e instanceof Error ? e.message : '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async onApproveTask() {
    if (!this.data.canApprove || this.data.approving || !this.data.taskId) return;
    const app = getApp<IAppOption>();
    if (!app.globalData.currentChildId) {
      wx.showToast({ title: '请先选择学生', icon: 'none' });
      return;
    }

    const res = await wx.showModal({
      title: '确认检查通过',
      content: '检查通过后任务会变为已完成，并发放奖励积分。',
    });
    if (!res.confirm) return;

    try {
      this.setData({ approving: true });
      await taskApi.review(this.data.taskId, { child_id: app.globalData.currentChildId, approved: true });
      wx.showToast({ title: '已完成并发放积分', icon: 'success' });
      await this.loadTask();
    } catch (e) {
      wx.showToast({ title: e instanceof Error ? e.message : '检查失败', icon: 'none' });
    } finally {
      this.setData({ approving: false });
    }
  },
});

interface IAppOption {
  globalData: {
    currentChildId: string;
  };
}
