const { taskApi } = require('../../../api/task');

Page({
  data: {
    taskId: '',
    text: '',
    submitting: false,
  },

  onLoad(query) {
    this.setData({ taskId: query.taskId || '' });
  },

  onTextInput(e) {
    this.setData({ text: e.detail.value });
  },

  async onSubmit() {
    var app = getApp();
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
      var res = await taskApi.submit(this.data.taskId, {
        child_id: app.globalData.currentChildId,
        submit_type: 1,
        submit_text: this.data.text,
      });

      var score = (res.data && res.data.check_result && res.data.check_result.score) || 0;
      var passed = res.data && res.data.check_result && res.data.check_result.is_passed;

      wx.showModal({
        title: passed ? '太棒了！' : '继续加油',
        content: '评分：' + score + '分' + (passed ? '\n任务已通过！' : '\n再检查一下吧'),
        showCancel: false,
        success: function () {
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
