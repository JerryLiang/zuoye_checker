const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { code: 401, message: '获取openid失败', data: null };
  }

  try {
    await ensureCollections([
      'users',
      'children',
      'homework_batches',
      'task_items',
      'check_results',
      'reward_records',
    ]);

    const user = await getOrCreateUser(openid);

    switch (action) {
      case 'weekly':
        return await getWeeklyReport(user._id, data || {});
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function ensureCollections(names) {
  for (const name of names) {
    try {
      await db.createCollection(name);
    } catch (err) {
      const msg = err && err.message ? err.message : '';
      // 已存在时忽略；其他错误继续抛出，避免掩盖权限/环境问题。
      if (!/exist|already|duplicate/i.test(msg)) {
        throw err;
      }
    }
  }
}

async function getOrCreateUser(openid) {
  const userRes = await db.collection('users').where({ openid }).get();
  if (userRes.data.length > 0) {
    return userRes.data[0];
  }

  const now = db.serverDate();
  const res = await db.collection('users').add({
    data: {
      openid,
      nickname: '家长用户',
      avatar_url: null,
      status: 1,
      api_token: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    _id: res._id,
    openid,
    nickname: '家长用户',
    avatar_url: null,
    status: 1,
    api_token: null,
  };
}

async function getWeeklyReport(userId, data) {
  const { child_id, start_date } = data;

  if (!child_id) {
    return { code: 400, message: '缺少child_id', data: null };
  }

  const childRes = await db.collection('children')
    .where({ _id: child_id, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  const weekStart = isDateString(start_date) ? start_date : getWeekStart();
  const weekEnd = getWeekEnd(weekStart);
  const weekDates = Array.from({ length: 7 }, (_, i) => formatDate(addDays(weekStart, i)));
  const dateSet = new Set(weekDates);

  const dailyMap = {};
  weekDates.forEach((dateStr, index) => {
    dailyMap[dateStr] = {
      date: dateStr,
      weekday: getWeekdayName(index),
      total: 0,
      completed: 0,
      avg_score: 0,
      points: 0,
      _scoreTotal: 0,
      _scoreCount: 0,
    };
  });

  const batchRes = await db.collection('homework_batches')
    .where({ user_id: userId, child_id, batch_date: _.gte(weekStart).and(_.lte(weekEnd)) })
    .get();
  const batches = batchRes.data || [];
  const batchDateMap = {};
  batches.forEach(batch => {
    if (dateSet.has(batch.batch_date)) {
      batchDateMap[batch._id] = batch.batch_date;
    }
  });

  const batchIds = Object.keys(batchDateMap);
  let tasks = [];
  if (batchIds.length > 0) {
    const taskRes = await db.collection('task_items')
      .where({ child_id, batch_id: _.in(batchIds) })
      .get();
    tasks = taskRes.data || [];
  }

  const taskDateMap = {};
  tasks.forEach(task => {
    const dateStr = batchDateMap[task.batch_id];
    if (!dateStr || !dailyMap[dateStr]) return;
    taskDateMap[task._id] = dateStr;
    dailyMap[dateStr].total += 1;
    if (task.status === 2) {
      dailyMap[dateStr].completed += 1;
    }
  });

  const taskIds = Object.keys(taskDateMap);
  if (taskIds.length > 0) {
    const checkRes = await db.collection('check_results')
      .where({ task_id: _.in(taskIds) })
      .get();
    (checkRes.data || []).forEach(check => {
      if (!check.checked_at) return;
      const dateStr = taskDateMap[check.task_id];
      if (!dateStr || !dailyMap[dateStr]) return;
      const score = Number(check.score || 0);
      dailyMap[dateStr]._scoreTotal += score;
      dailyMap[dateStr]._scoreCount += 1;
    });
  }

  const rewardRes = await db.collection('reward_records')
    .where({
      child_id,
      created_at: _.gte(dateStart(weekStart)).and(_.lt(dateEndExclusive(weekEnd))),
    })
    .get();

  let totalPoints = 0;
  let totalScore = 0;
  let scoreCount = 0;
  (rewardRes.data || []).forEach(record => {
    const points = Number(record.points || 0);
    totalPoints += points;
    const dateStr = formatDate(new Date(record.created_at));
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].points += points;
    }
  });

  const dailyStats = weekDates.map(dateStr => {
    const day = dailyMap[dateStr];
    totalScore += day._scoreTotal;
    scoreCount += day._scoreCount;
    day.avg_score = day._scoreCount > 0 ? Math.round(day._scoreTotal / day._scoreCount) : 0;
    delete day._scoreTotal;
    delete day._scoreCount;
    return day;
  });

  const totalTasks = dailyStats.reduce((sum, item) => sum + item.total, 0);
  const completedTasks = dailyStats.reduce((sum, item) => sum + item.completed, 0);

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
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        avg_score: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        total_points: totalPoints,
      },
      daily_stats: dailyStats,
    },
  };
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  return formatDate(weekStart);
}

function getWeekEnd(weekStart) {
  return formatDate(addDays(weekStart, 6));
}

function addDays(dateStr, days) {
  const date = parseDateLocal(dateStr);
  date.setDate(date.getDate() + days);
  return date;
}

function parseDateLocal(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateStart(dateStr) {
  const date = parseDateLocal(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateEndExclusive(dateStr) {
  const date = parseDateLocal(dateStr);
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekdayName(index) {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index] || '';
}
