const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 获取用户
  const userRes = await db.collection('users').where({ openid }).get();
  if (userRes.data.length === 0) {
    return { code: 401, message: '未登录', data: null };
  }
  const user = userRes.data[0];

  try {
    switch (action) {
      case 'weekly':
        return await getWeeklyReport(user._id, data);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function getWeeklyReport(userId, data) {
  const { child_id, start_date } = data;

  if (!child_id) {
    return { code: 400, message: '缺少child_id', data: null };
  }

  // 验证孩子归属
  const childRes = await db.collection('children')
    .where({ _id: child_id, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '孩子不存在', data: null };
  }

  // 计算本周日期范围
  const weekStart = start_date || getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // 获取本周每日完成情况
  const dailyStats = [];
  let totalTasks = 0;
  let completedTasks = 0;
  let totalScore = 0;
  let scoreCount = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateStr = formatDate(date);

    const completionRes = await db.collection('daily_completions')
      .where({ child_id, completion_date: dateStr })
      .get();

    const dayData = completionRes.data.length > 0 ? completionRes.data[0] : {
      total_tasks: 0,
      completed_tasks: 0,
    };

    // 获取当日任务的平均分
    const tasksRes = await db.collection('task_items')
      .where({ child_id })
      .get();

    let dayScore = 0;
    let dayScoreCount = 0;

    for (const task of tasksRes.data) {
      const submissionRes = await db.collection('task_submissions')
        .where({ task_id: task._id })
        .get();

      if (submissionRes.data.length > 0) {
        const checkRes = await db.collection('check_results')
          .where({ submission_id: submissionRes.data[0]._id })
          .get();

        if (checkRes.data.length > 0) {
          dayScore += checkRes.data[0].score;
          dayScoreCount++;
        }
      }
    }

    const avgScore = dayScoreCount > 0 ? Math.round(dayScore / dayScoreCount) : 0;

    dailyStats.push({
      date: dateStr,
      total: dayData.total_tasks,
      completed: dayData.completed_tasks,
      avg_score: avgScore,
    });

    totalTasks += dayData.total_tasks;
    completedTasks += dayData.completed_tasks;
    totalScore += dayScore;
    scoreCount += dayScoreCount;
  }

  // 获取积分账户
  const accountRes = await db.collection('reward_accounts')
    .where({ child_id })
    .get();

  const totalPoints = accountRes.data.length > 0 ? accountRes.data[0].total_points : 0;

  return {
    code: 0,
    message: 'ok',
    data: {
      child_id,
      week_start: weekStart,
      week_end: weekEnd,
      summary: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0,
        avg_score: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        total_points: totalPoints,
      },
      daily_stats: dailyStats,
    },
  };
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  return formatDate(weekStart);
}

function getWeekEnd(weekStart) {
  const start = new Date(weekStart);
  const end = addDays(start, 6);
  return formatDate(end);
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
