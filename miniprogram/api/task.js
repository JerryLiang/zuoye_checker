async function callTasks(action, data) {
  if (!data) data = {};
  const res = await wx.cloud.callFunction({
    name: 'tasks',
    data: { action, ...data },
  });
  return res.result;
}

const taskApi = {
  today(child_id, date) {
    return callTasks('today', { data: { child_id, date } });
  },
  submit(taskId, payload) {
    return callTasks('submit', { id: taskId, data: payload });
  },
};

module.exports = { taskApi };
