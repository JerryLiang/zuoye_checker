async function callRewards(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'rewards',
    data: { action, ...data },
  });
  return res.result as { code: number; message: string; data: any };
}

export const rewardApi = {
  overview(child_id: string) {
    return callRewards('overview', { data: { child_id } });
  },
};
