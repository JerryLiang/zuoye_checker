"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childApi = void 0;
async function callChildren(action, data = {}) {
    const res = await wx.cloud.callFunction({
        name: 'children',
        data: { action, ...data },
    });
    const result = res.result;
    if (result.code !== 0) {
        throw new Error(result.message || '请求失败');
    }
    return result;
}
exports.childApi = {
    list() {
        return callChildren('list');
    },
    get(id) {
        return callChildren('get', { id });
    },
    create(payload) {
        return callChildren('create', { data: payload });
    },
    update(id, payload) {
        return callChildren('update', { id, data: payload });
    },
    remove(id) {
        return callChildren('delete', { id });
    },
};
