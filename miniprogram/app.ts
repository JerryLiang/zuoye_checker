App<IAppOption>({
  globalData: {
    token: '',
    userId: '',
    currentChildId: '',
  },
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-env-id', // 替换为你的云开发环境ID
        traceUser: true,
      });
    }

    // 尝试恢复登录状态
    const token = wx.getStorageSync('token');
    const userId = wx.getStorageSync('userId');
    const currentChildId = wx.getStorageSync('currentChildId');

    if (token) this.globalData.token = token;
    if (userId) this.globalData.userId = userId;
    if (currentChildId) this.globalData.currentChildId = currentChildId;
  },
});

interface IAppOption {
  globalData: {
    token: string;
    userId: string;
    currentChildId: string;
  };
}
