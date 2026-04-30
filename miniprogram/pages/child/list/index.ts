import { childApi, ChildItem } from '../../../api/child';

Page({
  data: {
    children: [] as ChildItem[],
    currentChildId: '',
    loading: true,
  },

  onShow() {
    const app = getApp<IAppOption>();
    this.setData({ currentChildId: app.globalData.currentChildId });
    this.loadChildren();
  },

  async loadChildren() {
    try {
      this.setData({ loading: true });
      const res = await childApi.list();
      this.setData({ children: res.data || [] });
    } catch (_e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/child/edit/index' });
  },

  goEdit(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/child/edit/index?id=${id}` });
  },

  async onDelete(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id;
    const child = this.data.children.find((c) => c._id === id);
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除「${child?.name || ''}」吗？`,
    });
    if (!res.confirm) return;

    try {
      await childApi.remove(id);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadChildren();
    } catch (_e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onSelectChild(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id;
    const app = getApp<IAppOption>();
    app.globalData.currentChildId = id;
    wx.setStorageSync('currentChildId', id);
    this.setData({ currentChildId: id });
    wx.showToast({ title: '已切换', icon: 'success' });
  },
});

interface IAppOption {
  globalData: {
    currentChildId: string;
  };
}
