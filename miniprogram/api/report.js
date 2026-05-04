async function callReports(action, data) {
  if (!data) data = {};
  const res = await wx.cloud.callFunction({
    name: 'reports',
    data: { action, ...data },
  });
  return res.result;
}

const reportApi = {
  weekly(childId, startDate) {
    return callReports('weekly', { data: { child_id: childId, start_date: startDate } });
  },
};

module.exports = { reportApi };
