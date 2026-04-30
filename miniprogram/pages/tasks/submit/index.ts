import { taskApi } from '../../../api/task';

Page({
  data: {
    taskId: 0,
    text: '',
    submitting: false,
  },

  onLoad(query: Record<string, string>) {
    this.setData({ taskId: Number(query.taskId || 0) });
  },

  onTextInput(e: WechatMiniprogram.TextareaInput) {
    this.setData({ text: e.detail.value });
  },

  async onSubmit() {
    const app = getApp<IAppOption>();
    if (!this.data.taskId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    if (!this.data.text.trim()) {
      wx.showToast({ title: '请输入作业内容', icon: 'none' });
      return;
    }

    try {
      this.setData({ submitting: true });
      const res = await taskApi.submit(this.data.taskId, {
        child_id: app.globalData.currentChildId,
        submit_type: 1,
        submit_text: this.data.text,
      });

      const score = res.data?.check_result?.score ?? 0;
      const passed = res.data?.check_result?.is_passed;

      wx.showModal({
        title: passed ? '太棒了！' : '继续加油',
        content: `评分：${score}分${passed ? '\n任务已通过！' : '\n再检查一下吧'}`,
        showCancel: false,
        success: () => {
          wx.navigateBack();
        },
      });
    } catch (_e) {
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

interface IAppOption {
  globalData: {
    currentChildId: number;
  };
}
