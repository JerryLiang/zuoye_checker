export interface TaskItem {
  _id: string;
  title: string;
  status: 1 | 2 | 3;
}

async function callTasks(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'tasks',
    data: { action, ...data },
  });
  return res.result as { code: number; message: string; data: any };
}

export const taskApi = {
  today(child_id: string, date?: string) {
    return callTasks('today', { data: { child_id, date } });
  },
  submit(taskId: string, payload: { child_id: string; submit_type: 1 | 2 | 3; submit_text?: string; file_asset_id?: string }) {
    return callTasks('submit', { id: taskId, data: payload });
  },
};
