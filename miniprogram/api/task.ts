export interface TaskItem {
  _id: string;
  title: string;
  status: 1 | 2 | 3; // 1待完成 2已完成 3已提交待家长检查
}

async function callTasks(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'tasks',
    data: { action, ...data },
  });
  const result = res.result as { code: number; message: string; data: any };
  if (result.code !== 0) {
    throw new Error(result.message || '请求失败');
  }
  return result;
}

export const taskApi = {
  today(child_id: string, date?: string) {
    return callTasks('today', { data: { child_id, date } });
  },
  submit(taskId: string, payload: { child_id: string; submit_type: 1 | 2 | 3; submit_text?: string; file_asset_id?: string }) {
    return callTasks('submit', { id: taskId, data: payload });
  },
  review(taskId: string, payload: { child_id: string; approved?: boolean; feedback?: string }) {
    return callTasks('review', { id: taskId, data: payload });
  },
};
