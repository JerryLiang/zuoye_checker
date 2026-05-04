async function callRewards(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'rewards',
    data: { action, ...data },
  });
  const result = res.result as { code: number; message: string; data: any };
  if (result.code !== 0) {
    throw new Error(result.message || '请求失败');
  }
  return result;
}

export const rewardApi = {
  overview(child_id: string) {
    return callRewards('overview', { data: { child_id } });
  },
};
