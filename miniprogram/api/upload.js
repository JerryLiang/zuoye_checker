"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadApi = void 0;
exports.uploadApi = {
    upload(filePath, bizType, childId) {
        const app = getApp();
        const url = `${app.globalData.baseURL}/upload`;
        return new Promise((resolve, reject) => {
            wx.uploadFile({
                url,
                filePath,
                name: 'file',
                header: {
                    Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
                },
                formData: {
                    biz_type: bizType,
                    ...(childId ? { child_id: String(childId) } : {}),
                },
                success: (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const body = JSON.parse(res.data);
                        if (body.code === 0) {
                            resolve(body.data);
                            return;
                        }
                        reject(body);
                        return;
                    }
                    reject(res);
                },
                fail: reject,
            });
        });
    },
};
