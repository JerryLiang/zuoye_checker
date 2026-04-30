import { http } from './http';

export interface HomeworkBatch {
  id: number;
  user_id: number;
  child_id: number;
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
  id: number;
  title: string;
  status: 1 | 2 | 3;
  submission?: {
    id: number;
    submit_type: 1 | 2 | 3;
    submit_text?: string;
    file_asset_id?: number;
    submitted_at: string;
    check_result?: {
      is_passed: boolean;
      score: number;
      feedback: string;
    };
  };
}

export const homeworkApi = {
  list(child_id?: number) {
    return http.get<HomeworkBatch[]>('/homeworks', child_id ? { child_id } : undefined);
  },
  get(id: number) {
    return http.get<HomeworkBatch>(`/homeworks/${id}`);
  },
  create(payload: {
    child_id: number;
    subject?: string;
    input_source: 1 | 2 | 3 | 4;
    raw_text?: string;
    batch_date: string;
  }) {
    return http.post('/homeworks', payload);
  },
  update(id: number, payload: Partial<Pick<HomeworkBatch, 'subject' | 'raw_text' | 'status'>>) {
    return http.put(`/homeworks/${id}`, payload);
  },
  remove(id: number) {
    return http.del(`/homeworks/${id}`);
  },
};
