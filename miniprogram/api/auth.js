"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authApi = void 0;
exports.authApi = {
    async wechatLogin(payload = {}) {
        let code = payload.code;
        if (!code) {
            const loginRes = await new Promise((resolve, reject) => {
                wx.login({
                    success: resolve,
                    fail: reject,
                });
            });
            code = loginRes.code;
        }
        const res = await wx.cloud.callFunction({
            name: 'auth-login',
            data: {
                code,
                nickname: payload.nickname,
                avatar_url: payload.avatar_url,
            },
        });
        const result = res.result;
        if (result.code !== 0) {
            throw new Error(result.message || '登录失败');
        }
        return result;
    },
};
