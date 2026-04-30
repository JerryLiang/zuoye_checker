export interface HomeworkBatch {
  _id: string;
  user_id: string;
  child_id: string;
  subject: string;
  input_source: 1 | 2 | 3 | 4;
  raw_text: string;
  batch_date: string;
  status: 1 | 2;
  created_at: string;
  updated_at: string;
  tasks: TaskInBatch[];
}

export interface TaskInBatch {
  _id: string;
  title: string;
  status: 1 | 2 | 3;
  submission?: {
    _id: string;
    submit_type: 1 | 2 | 3;
    submit_text?: string;
    file_asset_id?: string;
    submitted_at: string;
    check_result?: {
      is_passed: boolean;
      score: number;
      feedback: string;
    };
  };
}

async function callHomeworks(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'homeworks',
    data: { action, ...data },
  });
  return res.result as { code: number; message: string; data: any };
}

export const homeworkApi = {
  list(child_id?: string) {
    return callHomeworks('list', { data: child_id ? { child_id } : {} });
  },
  get(id: string) {
    return callHomeworks('get', { id });
  },
  create(payload: {
    child_id: string;
    subject?: string;
    input_source: 1 | 2 | 3 | 4;
    raw_text?: string;
    batch_date: string;
  }) {
    return callHomeworks('create', { data: payload });
  },
  update(id: string, payload: Partial<Pick<HomeworkBatch, 'subject' | 'raw_text' | 'status'>>) {
    return callHomeworks('update', { id, data: payload });
  },
  remove(id: string) {
    return callHomeworks('delete', { id });
  },
};
