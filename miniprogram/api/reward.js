"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardApi = void 0;
async function callRewards(action, data = {}) {
    const res = await wx.cloud.callFunction({
        name: 'rewards',
        data: { action, ...data },
    });
    const result = res.result;
    if (result.code !== 0) {
        throw new Error(result.message || '请求失败');
    }
    return result;
}
exports.rewardApi = {
    overview(child_id) {
        return callRewards('overview', { data: { child_id } });
    },
};
