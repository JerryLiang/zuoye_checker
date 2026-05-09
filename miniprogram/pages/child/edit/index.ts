import { authApi } from '../../../api/auth';
import { childApi } from '../../../api/child';

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

  onLoad(options: Record<string, string>) {
    if (options.mode === 'onboarding') {
      this.setData({ isOnboarding: true });
      wx.setNavigationBarTitle({ title: '添加第一个孩子' });
      wx.hideHomeButton?.();
    }

    if (options.id) {
      const id = options.id;
      this.setData({ editId: id, isEdit: true, isOnboarding: false });
      wx.setNavigationBarTitle({ title: '编辑孩子' });
      this.ensureLogin().then(() => this.loadChild(id)).catch(() => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      });
    }
  },

  async ensureLogin() {
    const app = getApp<IAppOption>();
    if (app.globalData.userId && app.globalData.token) {
      return;
    }

    const loginRes = await authApi.wechatLogin({ nickname: '家长用户' });
    app.globalData.token = loginRes.data.token;
    app.globalData.userId = loginRes.data.user.id;
    wx.setStorageSync('token', loginRes.data.token);
    wx.setStorageSync('userId', loginRes.data.user.id);
  },

  async loadChild(id: string) {
    try {
      const res = await childApi.get(id);
      const child = res.data;
      const groups = ['3-6', '7-9', '10-12'];
      this.setData({
        name: child.name,
        ageGroup: child.age_group,
        ageIndex: groups.indexOf(child.age_group),
        grade: child.grade || '',
      });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onNameInput(e: WechatMiniprogram.Input) {
    this.setData({ name: e.detail.value });
  },

  onGradeInput(e: WechatMiniprogram.Input) {
    this.setData({ grade: e.detail.value });
  },

  onAgeChange(e: WechatMiniprogram.PickerChange) {
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
      await this.ensureLogin();

      if (this.data.isEdit) {
        await childApi.update(this.data.editId, {
          name: this.data.name.trim(),
          age_group: this.data.ageGroup as '3-6' | '7-9' | '10-12',
          grade: this.data.grade,
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      } else {
        const res = await childApi.create({
          name: this.data.name.trim(),
          age_group: this.data.ageGroup as '3-6' | '7-9' | '10-12',
          grade: this.data.grade,
        });

        const childId = res.data._id;
        const app = getApp<IAppOption>();
        app.globalData.currentChildId = childId;
        wx.setStorageSync('currentChildId', childId);

        wx.showToast({ title: '添加成功', icon: 'success' });
        setTimeout(() => {
          if (this.data.isOnboarding) {
            wx.switchTab({ url: '/pages/index/index' });
          } else {
            wx.navigateBack();
          }
        }, 500);
      }
    } catch (_e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
});

interface IAppOption {
  globalData: {
    token: string;
    userId: string;
    currentChildId: string;
  };
}
