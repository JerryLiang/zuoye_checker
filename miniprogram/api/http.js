"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.http = void 0;
function request(method, path, data, header = {}) {
    const app = getApp();
    const url = `${app.globalData.baseURL}${path}`;
    return new Promise((resolve, reject) => {
        wx.request({
            url,
            method,
            data,
            header: {
                'content-type': 'application/json',
                Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
                ...header,
            },
            success: (res) => {
                const body = res.data;
                if (res.statusCode >= 200 && res.statusCode < 300 && body && typeof body.code === 'number') {
                    resolve(body);
                    return;
                }
                reject(body || res);
            },
            fail: reject,
        });
    });
}
exports.http = {
    get: (path, data) => request('GET', path, data),
    post: (path, data) => request('POST', path, data),
    put: (path, data) => request('PUT', path, data),
    patch: (path, data) => request('PATCH', path, data),
    del: (path, data) => request('DELETE', path, data),
};
