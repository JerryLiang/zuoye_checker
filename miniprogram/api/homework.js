async function callHomeworks(action, data) {
  if (!data) data = {};
  const res = await wx.cloud.callFunction({
    name: 'homeworks',
    data: { action, ...data },
  });
  return res.result;
}

const homeworkApi = {
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

module.exports = { homeworkApi };
