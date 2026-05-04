async function callCloud(name, data) {
  if (!data) data = {};
  try {
    const res = await wx.cloud.callFunction({
      name,
      data,
    });
    return res.result;
  } catch (err) {
    return {
      code: 500,
      message: (err && err.message) || '云函数调用失败',
      data: null,
    };
  }
}

const http = {
  get(path, data) {
    var parts = path.split('/').filter(Boolean);
    var resource = parts[0];
    var actionName = parts[1] || 'list';
    return callCloud(resource, { action: actionName, data: data, id: actionName && !isNaN(Number(actionName)) ? actionName : undefined });
  },

  post(path, data) {
    var parts = path.split('/').filter(Boolean);
    var funcName = parts[0];

    // 特殊处理提交任务
    if (funcName === 'tasks' && parts.length >= 3 && parts[2] === 'submit') {
      return callCloud(funcName, { action: 'submit', id: parts[1], data: data });
    }

    return callCloud(funcName, { action: 'create', data: data });
  },

  put(path, data) {
    var parts = path.split('/').filter(Boolean);
    return callCloud(parts[0], { action: 'update', id: parts[1], data: data });
  },

  patch(path, data) {
    var parts = path.split('/').filter(Boolean);
    return callCloud(parts[0], { action: 'update', id: parts[1], data: data });
  },

  del(path, data) {
    var parts = path.split('/').filter(Boolean);
    return callCloud(parts[0], { action: 'delete', id: parts[1], data: data });
  },
};

module.exports = { http };
