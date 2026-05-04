import { homeworkApi } from '../../../api/homework';

Page({
  data: {
    subject: '语文',
    subjects: ['语文', '数学', '英语', '科学', '其他'],
    subjectIndex: 0,
    rawText: '',
    batchDate: '',
    submitting: false,
  },

  onLoad() {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ batchDate: date });
  },

  onSubjectChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    this.setData({ subjectIndex: idx, subject: this.data.subjects[idx] });
  },

  onTextInput(e: WechatMiniprogram.TextareaInput) {
    this.setData({ rawText: e.detail.value });
  },

  onDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ batchDate: e.detail.value as string });
  },

  async onSubmit() {
    const app = getApp<IAppOption>();
    if (!app.globalData.currentChildId) {
      wx.showToast({ title: '请先在首页选择孩子', icon: 'none' });
      return;
    }

    if (!this.data.rawText.trim()) {
      wx.showToast({ title: '请输入作业内容', icon: 'none' });
      return;
    }

    try {
      this.setData({ submitting: true });
      await homeworkApi.create({
        child_id: app.globalData.currentChildId,
        subject: this.data.subject,
        input_source: 1,
        raw_text: this.data.rawText,
        batch_date: this.data.batchDate,
      });

      wx.showToast({ title: '作业已创建', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/tasks/today/index' });
      }, 800);
    } catch (_e) {
      wx.showToast({ title: '创建失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

interface IAppOption {
  globalData: {
    userId: string;
    currentChildId: string;
  };
}
