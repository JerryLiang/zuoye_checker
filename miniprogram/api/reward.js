"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardApi = void 0;
const http_1 = require("./http");
exports.rewardApi = {
    overview(child_id) {
        return http_1.http.get('/rewards/overview', { child_id });
    },
};
