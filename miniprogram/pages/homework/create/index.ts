import { homeworkApi } from '../../../api/homework';
import { uploadApi } from '../../../api/upload';
import { requireParentAuth } from '../../../utils/parentAuth';

type InputMode = 'text' | 'photo';
type HomeworkInputItem = { subject?: string; text: string };

Page({
  data: {
    subject: '语文',
    subjects: ['语文', '数学', '英语', '其他'],
    subjectIndex: 0,
    rawText: '',
    homeworkItems: [{ text: '' }] as HomeworkInputItem[],
    recognizedItems: [] as HomeworkInputItem[],
    batchDate: '',
    submitting: false,
    inputMode: 'text' as InputMode,
    autoCheckMath: false,
    answerText: '',
    imagePath: '',
    fileAssetId: '',
    recognizing: false,
  },

  onLoad() {
    if (!requireParentAuth('/pages/homework/create/index')) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ batchDate: date });
  },

  onModeChange(e: WechatMiniprogram.BaseEvent) {
    const mode = e.currentTarget.dataset.mode as InputMode;
    this.setData({ inputMode: mode });
  },

  onSubjectChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const subject = this.data.subjects[idx];
    this.setData({
      subjectIndex: idx,
      subject,
      autoCheckMath: subject === '数学' ? this.data.autoCheckMath : false,
      answerText: subject === '数学' ? this.data.answerText : '',
    });
  },

  onTaskInput(e: WechatMiniprogram.Input) {
    const index = Number(e.currentTarget.dataset.index);
    const homeworkItems = this.data.homeworkItems.slice();
    homeworkItems[index] = { ...homeworkItems[index], text: e.detail.value };
    this.updateHomeworkItems(homeworkItems);
  },

  addHomeworkItem() {
    const homeworkItems = this.data.homeworkItems.concat({ text: '' });
    this.updateHomeworkItems(homeworkItems);
  },

  removeHomeworkItem(e: WechatMiniprogram.BaseEvent) {
    const index = Number(e.currentTarget.dataset.index);
    const homeworkItems = this.data.homeworkItems.filter((_item, idx) => idx !== index);
    this.updateHomeworkItems(homeworkItems.length > 0 ? homeworkItems : [{ text: '' }]);
  },

  updateHomeworkItems(homeworkItems: HomeworkInputItem[]) {
    const rawText = homeworkItems
      .map(item => item.text.trim())
      .filter(Boolean)
      .join('\n');
    this.setData({ homeworkItems, rawText });
  },

  onAnswerInput(e: WechatMiniprogram.TextareaInput) {
    this.setData({ answerText: e.detail.value });
  },

  onAutoCheckChange(e: WechatMiniprogram.SwitchChange) {
    if (this.data.subject !== '数学') {
      wx.showToast({ title: '第一版仅支持数学批改', icon: 'none' });
      this.setData({ autoCheckMath: false, answerText: '' });
      return;
    }
    this.setData({ autoCheckMath: e.detail.value });
  },

  onDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ batchDate: e.detail.value as string });
  },

  async chooseHomeworkImage() {
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

      this.setData({ imagePath: filePath, recognizing: true, recognizedItems: [], rawText: '' });
      const asset = await uploadApi.upload(filePath, 'homework_input', app.globalData.currentChildId);
      this.setData({ fileAssetId: asset._id });

      const recognized = await homeworkApi.recognizeImage(asset._id);
      if (recognized?.data) {
        const subjectIndex = this.data.subjects.indexOf(recognized.data.subject || this.data.subject);
        const subject = subjectIndex >= 0 ? this.data.subjects[subjectIndex] : this.data.subject;
        const recognizedItems = this.buildRecognizedItems(recognized.data.recognized_items, recognized.data.raw_text, subject);
        const rawText = recognizedItems.map(item => item.text).join('\n');
        this.setData({
          rawText,
          recognizedItems,
          batchDate: recognized.data.batch_date || this.data.batchDate,
          subject,
          subjectIndex: subjectIndex >= 0 ? subjectIndex : this.data.subjectIndex,
        });

        if (recognized.data.provider_message) {
          wx.showToast({ title: recognized.data.provider_message, icon: 'none' });
        } else if (recognizedItems.length > 0) {
          wx.showToast({ title: '识别完成，请确认后提交', icon: 'success' });
        }
      }
    } catch (e) {
      console.error('图片识别失败', e);
      wx.showToast({ title: e instanceof Error ? e.message : '图片识别失败', icon: 'none' });
    } finally {
      this.setData({ recognizing: false });
    }
  },

  buildRecognizedItems(items: HomeworkInputItem[] | undefined, rawText = '', fallbackSubject: string) {
    if (Array.isArray(items) && items.length > 0) {
      return items
        .map(item => ({
          subject: this.normalizeSubject(item.subject || fallbackSubject),
          text: String(item.text || '').trim(),
        }))
        .filter(item => item.text);
    }

    return String(rawText || '')
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(text => ({ subject: fallbackSubject, text }));
  },

  normalizeSubject(subject = '其他') {
    return this.data.subjects.includes(subject) ? subject : '其他';
  },

  getSubmitItems() {
    const sourceItems = this.data.inputMode === 'photo'
      ? this.data.recognizedItems
      : this.data.homeworkItems.map(item => ({ subject: this.data.subject, text: item.text }));

    return sourceItems
      .map(item => ({
        subject: this.normalizeSubject(item.subject || this.data.subject),
        text: String(item.text || '').trim(),
      }))
      .filter(item => item.text);
  },

  async onSubmit() {
    if (this.data.submitting || this.data.recognizing) {
      return;
    }

    const app = getApp<IAppOption>();
    if (!app.globalData.currentChildId) {
      wx.showToast({ title: '请先添加学生', icon: 'none' });
      wx.navigateTo({ url: '/pages/child/edit/index?mode=onboarding' });
      return;
    }

    const submitItems = this.getSubmitItems();
    if (submitItems.length === 0) {
      wx.showToast({ title: this.data.inputMode === 'photo' ? '请先上传图片识别作业' : '请输入作业内容', icon: 'none' });
      return;
    }

    if (this.data.autoCheckMath && !this.data.answerText.trim()) {
      wx.showToast({ title: '请输入数学答案', icon: 'none' });
      return;
    }

    try {
      this.setData({ submitting: true });
      const subjects = submitItems.map(item => item.subject).filter(Boolean);
      const uniqueSubjects = subjects.filter((subject, index) => subjects.indexOf(subject) === index);
      await homeworkApi.create({
        child_id: app.globalData.currentChildId,
        subject: uniqueSubjects.length === 1 ? uniqueSubjects[0] : '其他',
        input_source: this.data.inputMode === 'photo' ? 2 : 1,
        raw_text: submitItems.map(item => item.text).join('\n'),
        task_items: submitItems,
        batch_date: this.data.batchDate,
        file_asset_id: this.data.fileAssetId || undefined,
        check_answers: this.data.autoCheckMath ? this.data.answerText : undefined,
      });

      wx.showToast({ title: '作业已创建', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 800);
    } catch (e: any) {
      console.error('创建作业失败', e);
      wx.showToast({ title: e?.message || '创建失败，请重试', icon: 'none' });
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
