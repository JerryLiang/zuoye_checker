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
      case 'overview':
        return await getOverview(user._id, data);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function getOverview(userId, data) {
  const { child_id } = data;

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

  // 获取积分账户
  const accountRes = await db.collection('reward_accounts')
    .where({ child_id })
    .get();

  const account = accountRes.data.length > 0 ? accountRes.data[0] : {
    total_points: 0,
    streak_days: 0,
  };

  // 获取最近的奖励记录
  const recordsRes = await db.collection('reward_records')
    .where({ child_id })
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();

  // 获取今日完成情况
  const today = getTodayDate();
  const completionRes = await db.collection('daily_completions')
    .where({ child_id, completion_date: today })
    .get();

  const todayCompletion = completionRes.data.length > 0 ? completionRes.data[0] : {
    total_tasks: 0,
    completed_tasks: 0,
    is_all_completed: 0,
  };

  return {
    code: 0,
    message: 'ok',
    data: {
      account,
      records: recordsRes.data,
      total_points: account.total_points,
      streak_days: account.streak_days,
      today_completion: todayCompletion,
      recent_records: recordsRes.data,
    },
  };
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
