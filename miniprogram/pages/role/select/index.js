"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parentAuth_1 = require("../../../utils/parentAuth");
Page({
    async onLoad() {
        const app = getApp();
        await app.globalData.loginPromise;
        if (app.globalData.isNewUser) {
            wx.navigateTo({ url: '/pages/profile/setup/index' });
        }
    },
    goChild() {
        wx.setStorageSync('activeRole', 'child');
        wx.switchTab({ url: '/pages/index/index' });
    },
    goParent() {
        wx.setStorageSync('activeRole', 'parent');
        if ((0, parentAuth_1.isParentAuthed)()) {
            wx.navigateTo({ url: '/pages/parent/home/index' });
        }
        else {
            wx.navigateTo({ url: '/pages/parent/auth/index?redirect=/pages/parent/home/index' });
        }
    },
});
