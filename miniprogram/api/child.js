async function callChildren(action, data) {
  if (!data) data = {};
  const res = await wx.cloud.callFunction({
    name: 'children',
    data: { action, ...data },
  });
  return res.result;
}

const childApi = {
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

module.exports = { childApi };
