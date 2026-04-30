"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeworkApi = void 0;
const http_1 = require("./http");
exports.homeworkApi = {
    list(child_id) {
        return http_1.http.get('/homeworks', child_id ? { child_id } : undefined);
    },
    get(id) {
        return http_1.http.get(`/homeworks/${id}`);
    },
    create(payload) {
        return http_1.http.post('/homeworks', payload);
    },
    update(id, payload) {
        return http_1.http.put(`/homeworks/${id}`, payload);
    },
    remove(id) {
        return http_1.http.del(`/homeworks/${id}`);
    },
};
