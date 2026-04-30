"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childApi = void 0;
const http_1 = require("./http");
exports.childApi = {
    list() {
        return http_1.http.get('/children');
    },
    get(id) {
        return http_1.http.get(`/children/${id}`);
    },
    create(payload) {
        return http_1.http.post('/children', payload);
    },
    update(id, payload) {
        return http_1.http.put(`/children/${id}`, payload);
    },
    remove(id) {
        return http_1.http.del(`/children/${id}`);
    },
};
