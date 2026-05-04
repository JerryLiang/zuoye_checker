"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportApi = void 0;
async function callReports(action, data = {}) {
    const res = await wx.cloud.callFunction({
        name: 'reports',
        data: { action, ...data },
    });
    const result = res.result;
    if (result.code !== 0) {
        throw new Error(result.message || '请求失败');
    }
    return result;
}
exports.reportApi = {
    weekly(childId, startDate) {
        return callReports('weekly', { data: { child_id: childId, start_date: startDate } });
    },
};
