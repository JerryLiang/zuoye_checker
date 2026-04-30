App<IAppOption>({
  globalData: {
    baseURL: '',
    token: '',
    userId: 0,
    currentChildId: 0,
  },
  onLaunch() {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;

    if (envVersion === 'develop') {
      this.globalData.baseURL = 'http://127.0.0.1:8000/api/v1';
    } else {
      this.globalData.baseURL = 'https://api.example.com/api/v1';
    }

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
    baseURL: string;
    token: string;
    userId: number;
    currentChildId: number;
  };
}
