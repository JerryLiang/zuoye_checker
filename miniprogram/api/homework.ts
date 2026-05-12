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
  total_tasks?: number;
  completed_tasks?: number;
  progress_pct?: number;
}

export interface TaskInBatch {
  _id: string;
  title: string;
  status: 1 | 2 | 3; // 1待完成 2已完成 3已提交待家长检查
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

async function callHomeworks(action: string, data: any = {}, options: { timeout?: number } = {}) {
  const callOptions: any = {
    name: 'homeworks',
    data: { action, ...data },
  };
  if (options.timeout) {
    callOptions.timeout = options.timeout;
  }
  const res = await (wx.cloud.callFunction as any)(callOptions);
  const result = res.result as { code: number; message: string; data: any };
  if (result.code !== 0) {
    throw new Error(result.message || '请求失败');
  }
  return result;
}

export interface HomeworkRecognitionItem {
  subject?: string;
  text: string;
}

export interface HomeworkRecognitionResult {
  subject?: string;
  batch_date?: string;
  raw_text?: string;
  recognized_items?: HomeworkRecognitionItem[];
  confidence?: number;
  provider_message?: string;
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
    task_items?: HomeworkRecognitionItem[];
    batch_date: string;
    file_asset_id?: string;
    file_asset_ids?: string[];
    check_answers?: string;
  }) {
    return callHomeworks('create', { data: payload });
  },
  recognizeImage(file_asset_id: string) {
    return callHomeworks('recognize_image', { data: { file_asset_id } }, { timeout: 60000 }) as Promise<{ code: number; message: string; data: HomeworkRecognitionResult }>;
  },
  update(id: string, payload: Partial<Pick<HomeworkBatch, 'subject' | 'raw_text' | 'status'>>) {
    return callHomeworks('update', { id, data: payload });
  },
  remove(id: string) {
    return callHomeworks('delete', { id });
  },
};
