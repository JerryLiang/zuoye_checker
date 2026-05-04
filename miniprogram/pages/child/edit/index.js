const { childApi } = require('../../../api/child');

Page({
  data: {
    editId: '',
    name: '',
    ageGroup: '3-6',
    ageIndex: 0,
    grade: '',
    isEdit: false,
  },

  onLoad(options) {
    if (options.id) {
      var id = options.id;
      this.setData({ editId: id, isEdit: true });
      wx.setNavigationBarTitle({ title: '编辑孩子' });
      this.loadChild(id);
    }
  },

  async loadChild(id) {
    try {
      var res = await childApi.get(id);
      var child = res.data;
      var groups = ['3-6', '7-9', '10-12'];
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

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onGradeInput(e) {
    this.setData({ grade: e.detail.value });
  },

  onAgeChange(e) {
    var map = ['3-6', '7-9', '10-12'];
    var idx = Number(e.detail.value);
    this.setData({ ageGroup: map[idx], ageIndex: idx });
  },

  async onSubmit() {
    if (!this.data.name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    try {
      if (this.data.isEdit) {
        await childApi.update(this.data.editId, {
          name: this.data.name,
          age_group: this.data.ageGroup,
          grade: this.data.grade,
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        await childApi.create({
          name: this.data.name,
          age_group: this.data.ageGroup,
          grade: this.data.grade,
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }
      setTimeout(function () { wx.navigateBack(); }, 500);
    } catch (_e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
});
