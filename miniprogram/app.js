"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./env/config"));
App({
    globalData: {
        token: '',
        userId: '',
        currentChildId: '',
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
        // 尝试恢复登录状态
        const token = wx.getStorageSync('token');
        const userId = wx.getStorageSync('userId');
        const currentChildId = wx.getStorageSync('currentChildId');
        if (token)
            this.globalData.token = token;
        if (userId)
            this.globalData.userId = userId;
        if (currentChildId)
            this.globalData.currentChildId = currentChildId;
    },
});
