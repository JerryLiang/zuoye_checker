"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./env/config"));
const auth_1 = require("./api/auth");
App({
    globalData: {
        userId: '',
        currentChildId: '',
        loginPromise: null,
        isNewUser: false,
        nickname: '',
        avatarUrl: '',
    },
    onLaunch() {
        if (!wx.cloud) {
            console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        }
        else {
            wx.cloud.init({
                env: config_1.default.cloudEnvId,
                traceUser: true,
            });
        }
        wx.removeStorageSync('token');
        const userId = wx.getStorageSync('userId');
        const currentChildId = wx.getStorageSync('currentChildId');
        if (userId)
            this.globalData.userId = userId;
        if (currentChildId)
            this.globalData.currentChildId = currentChildId;
        this.globalData.loginPromise = this.ensureLogin();
    },
    async ensureLogin() {
        try {
            const loginRes = await auth_1.authApi.wechatLogin();
            const newUserId = loginRes.data.user.id;
            if (this.globalData.userId && this.globalData.userId !== newUserId) {
                wx.removeStorageSync('currentChildId');
                this.globalData.currentChildId = '';
            }
            this.globalData.userId = newUserId;
            this.globalData.isNewUser = !!loginRes.data.is_new;
            this.globalData.nickname = loginRes.data.user.nickname || '';
            this.globalData.avatarUrl = loginRes.data.user.avatar_url || '';
            wx.setStorageSync('userId', newUserId);
        }
        catch (err) {
            console.error('自动登录失败', err);
        }
    },
});
