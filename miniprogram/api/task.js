"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskApi = void 0;
async function callTasks(action, data = {}) {
    const res = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action, ...data },
    });
    const result = res.result;
    if (result.code !== 0) {
        throw new Error(result.message || '请求失败');
    }
    return result;
}
exports.taskApi = {
    today(child_id, date) {
        return callTasks('today', { data: { child_id, date } });
    },
    submit(taskId, payload) {
        return callTasks('submit', { id: taskId, data: payload });
    },
};
