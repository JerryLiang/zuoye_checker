import { http } from './http';

export interface TaskItem {
  id: number;
  title: string;
  status: 1 | 2 | 3;
}

export const taskApi = {
  today(child_id: number, date?: string) {
    return http.get<TaskItem[]>('/tasks/today', { child_id, date });
  },
  submit(taskId: number, payload: { child_id: number; submit_type: 1 | 2 | 3; submit_text?: string; file_asset_id?: number }) {
    return http.post(`/tasks/${taskId}/submit`, payload);
  },
};
