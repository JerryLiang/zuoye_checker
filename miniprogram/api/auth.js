"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authApi = void 0;
const http_1 = require("./http");
exports.authApi = {
    wechatLogin(payload) {
        return http_1.http.post('/auth/wechat-login', payload);
    },
};
