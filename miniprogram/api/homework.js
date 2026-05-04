"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeworkApi = void 0;
async function callHomeworks(action, data = {}) {
    const res = await wx.cloud.callFunction({
        name: 'homeworks',
        data: { action, ...data },
    });
    const result = res.result;
    if (result.code !== 0) {
        throw new Error(result.message || '请求失败');
    }
    return result;
}
exports.homeworkApi = {
    list(child_id) {
        return callHomeworks('list', { data: child_id ? { child_id } : {} });
    },
    get(id) {
        return callHomeworks('get', { id });
    },
    create(payload) {
        return callHomeworks('create', { data: payload });
    },
    update(id, payload) {
        return callHomeworks('update', { id, data: payload });
    },
    remove(id) {
        return callHomeworks('delete', { id });
    },
};
