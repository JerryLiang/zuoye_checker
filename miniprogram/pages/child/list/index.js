const { childApi } = require('../../../api/child');

Page({
  data: {
    children: [],
    currentChildId: '',
    loading: true,
  },

  onShow() {
    var app = getApp();
    this.setData({ currentChildId: app.globalData.currentChildId });
    this.loadChildren();
  },

  async loadChildren() {
    try {
      this.setData({ loading: true });
      var res = await childApi.list();
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

  goEdit(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/child/edit/index?id=' + id });
  },

  async onDelete(e) {
    var id = e.currentTarget.dataset.id;
    var child = this.data.children.find(function (c) { return c._id === id; });
    var res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除「' + (child ? child.name : '') + '」吗？',
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

  onSelectChild(e) {
    var id = e.currentTarget.dataset.id;
    var app = getApp();
    app.globalData.currentChildId = id;
    wx.setStorageSync('currentChildId', id);
    this.setData({ currentChildId: id });
    wx.showToast({ title: '已切换', icon: 'success' });
  },
});
