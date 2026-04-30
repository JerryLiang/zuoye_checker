const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data, id } = event;
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
      case 'today':
        return await getTodayTasks(user._id, data);
      case 'submit':
        return await submitTask(user._id, id, data);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function getTodayTasks(userId, data) {
  const { child_id, date } = data;

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

  // 获取今天的日期（如果没有指定）
  const targetDate = date || getTodayDate();

  // 获取该日期的作业批次
  const batchRes = await db.collection('homework_batches')
    .where({ child_id, batch_date: targetDate })
    .get();

  if (batchRes.data.length === 0) {
    return { code: 0, message: 'ok', data: [] };
  }

  const batchIds = batchRes.data.map(b => b._id);

  // 获取任务
  const tasksRes = await db.collection('task_items')
    .where({ batch_id: _.in(batchIds), child_id })
    .orderBy('sort_order', 'asc')
    .orderBy('_id', 'asc')
    .get();

  return { code: 0, message: 'ok', data: tasksRes.data };
}

async function submitTask(userId, taskId, data) {
  const { child_id, submit_type, submit_text, file_asset_id } = data;

  if (!child_id || !submit_type) {
    return { code: 400, message: '缺少必要参数', data: null };
  }

  // 验证孩子归属
  const childRes = await db.collection('children')
    .where({ _id: child_id, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '孩子不存在', data: null };
  }

  // 获取任务
  const taskRes = await db.collection('task_items')
    .where({ _id: taskId })
    .get();

  if (taskRes.data.length === 0) {
    return { code: 404, message: '任务不存在', data: null };
  }

  const task = taskRes.data[0];

  // 验证任务归属
  if (task.child_id !== child_id) {
    return { code: 403, message: '任务归属不匹配', data: null };
  }

  const now = db.serverDate();

  // 创建提交记录
  const submissionData = {
    task_id: taskId,
    child_id,
    submit_type,
    submit_text: submit_text || null,
    file_asset_id: file_asset_id || null,
    submitted_at: now,
    created_at: now,
  };

  const submissionRes = await db.collection('task_submissions').add({ data: submissionData });
  const submissionId = submissionRes._id;

  // 简单的批改逻辑
  let score = 0;
  let isPassed = 0;

  if (file_asset_id) {
    score = 85;
    isPassed = 1;
  } else if ((submit_text || '').length >= 6) {
    score = 80;
    isPassed = 1;
  } else {
    score = 40;
  }

  // 创建批改结果
  const checkData = {
    submission_id: submissionId,
    task_id: taskId,
    check_engine: 'rule_v1',
    is_passed: isPassed,
    score,
    feedback: isPassed ? '完成得不错，继续加油！' : '再补充一点内容就更好了。',
    detail_json: { rule: 'simple_v1' },
    checked_at: now,
    created_at: now,
  };

  const checkRes = await db.collection('check_results').add({ data: checkData });

  // 如果通过，更新任务状态并添加奖励
  if (isPassed) {
    // 更新任务状态
    await db.collection('task_items').doc(taskId).update({
      data: { status: 2, updated_at: now },
    });

    // 添加积分奖励
    await db.collection('reward_accounts').where({ child_id }).update({
      data: {
        total_points: _.inc(2),
        updated_at: now,
      },
    }).catch(() => {
      // 如果不存在，创建新的
      db.collection('reward_accounts').add({
        data: {
          child_id,
          total_points: 2,
          streak_days: 0,
          created_at: now,
          updated_at: now,
        },
      });
    });

    // 记录奖励
    await db.collection('reward_records').add({
      data: {
        child_id,
        source_type: 'task_complete',
        source_id: taskId,
        points: 2,
        description: '完成任务奖励积分',
        created_at: now,
      },
    });

    // 更新每日完成情况
    if (task.batch_id) {
      const batchRes = await db.collection('homework_batches').doc(task.batch_id).get();
      if (batchRes.data) {
        const batchDate = batchRes.data.batch_date;

        const allCount = await db.collection('task_items')
          .where({ batch_id: task.batch_id })
          .count();

        const doneCount = await db.collection('task_items')
          .where({ batch_id: task.batch_id, status: 2 })
          .count();

        const totalCount = allCount.total;
        const completedCount = doneCount.total;

        await db.collection('daily_completions').where({
          child_id,
          completion_date: batchDate,
        }).update({
          data: {
            total_tasks: totalCount,
            completed_tasks: completedCount,
            is_all_completed: totalCount > 0 && totalCount === completedCount ? 1 : 0,
            updated_at: now,
          },
        }).catch(() => {
          db.collection('daily_completions').add({
            data: {
              child_id,
              completion_date: batchDate,
              total_tasks: totalCount,
              completed_tasks: completedCount,
              is_all_completed: totalCount > 0 && totalCount === completedCount ? 1 : 0,
              created_at: now,
              updated_at: now,
            },
          });
        });
      }
    }
  }

  return {
    code: 0,
    message: 'submitted',
    data: {
      submission: { _id: submissionId, ...submissionData },
      check_result: { _id: checkRes._id, ...checkData },
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
