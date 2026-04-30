"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskApi = void 0;
const http_1 = require("./http");
exports.taskApi = {
    today(child_id, date) {
        return http_1.http.get('/tasks/today', { child_id, date });
    },
    submit(taskId, payload) {
        return http_1.http.post(`/tasks/${taskId}/submit`, payload);
    },
};
