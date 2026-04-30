export interface WeeklyReport {
  child_id: string;
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

async function callReports(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'reports',
    data: { action, ...data },
  });
  return res.result as { code: number; message: string; data: any };
}

export const reportApi = {
  weekly(childId: string, startDate?: string) {
    return callReports('weekly', { data: { child_id: childId, start_date: startDate } });
  },
};
