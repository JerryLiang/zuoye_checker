async function callRewards(action, data) {
  if (!data) data = {};
  const res = await wx.cloud.callFunction({
    name: 'rewards',
    data: { action, ...data },
  });
  return res.result;
}

const rewardApi = {
  overview(child_id) {
    return callRewards('overview', { data: { child_id } });
  },
};

module.exports = { rewardApi };
