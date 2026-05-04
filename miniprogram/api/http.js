"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.http = void 0;
async function callCloud(name, data = {}) {
    const res = await wx.cloud.callFunction({
        name,
        data,
    });
    const result = res.result;
    if (result.code !== 0) {
        throw new Error(result.message || '请求失败');
    }
    return result;
}
exports.http = {
    // 兼容旧接口，实际调用云函数
    get: (path, data) => {
        const [resource, action] = path.split('/').filter(Boolean);
        const funcName = resource;
        const actionName = action || 'list';
        return callCloud(funcName, { action: actionName, data, id: action && !isNaN(Number(action)) ? action : undefined });
    },
    post: (path, data) => {
        const parts = path.split('/').filter(Boolean);
        const funcName = parts[0];
        // 特殊处理提交任务
        if (funcName === 'tasks' && parts.length >= 3 && parts[2] === 'submit') {
            return callCloud(funcName, { action: 'submit', id: parts[1], data });
        }
        return callCloud(funcName, { action: 'create', data });
    },
    put: (path, data) => {
        const parts = path.split('/').filter(Boolean);
        const funcName = parts[0];
        return callCloud(funcName, { action: 'update', id: parts[1], data });
    },
    patch: (path, data) => {
        const parts = path.split('/').filter(Boolean);
        const funcName = parts[0];
        return callCloud(funcName, { action: 'update', id: parts[1], data });
    },
    del: (path, data) => {
        const parts = path.split('/').filter(Boolean);
        const funcName = parts[0];
        return callCloud(funcName, { action: 'delete', id: parts[1], data });
    },
};
