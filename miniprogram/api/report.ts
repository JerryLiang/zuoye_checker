import { http } from './http';

export interface WeeklyReport {
  child_id: number;
  week_start: string;
  week_end: string;
  summary: {
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    avg_score: number;
    total_points: number;
  };
  daily_stats: Array<{
    date: string;
    total: number;
    completed: number;
    avg_score: number;
  }>;
}

export const reportApi = {
  weekly(childId: number, startDate?: string) {
    return http.get<WeeklyReport>('/reports/weekly', { child_id: childId, start_date: startDate });
  },
};
