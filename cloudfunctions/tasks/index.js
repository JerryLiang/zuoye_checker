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
      case 'get':
        return await getTask(user._id, id, data);
      case 'today':
        return await getTodayTasks(user._id, data);
      case 'submit':
        return await submitTask(user._id, id, data);
      case 'review':
        return await reviewTask(user._id, id, data);
      case 'delete':
        return await deleteTask(user._id, id, data);
      default:
        return { code: 400, message: '未知操作', data: null };
    }
  } catch (err) {
    return { code: 500, message: err.message, data: null };
  }
};

async function deleteTask(userId, taskId, data = {}) {
  const { child_id } = data;
  if (!child_id) {
    return { code: 400, message: '缺少child_id', data: null };
  }

  const taskCheck = await getOwnedTask(userId, taskId, child_id);
  if (taskCheck.error) return taskCheck.error;
  const task = taskCheck.task;

  if (task.status !== 1) {
    return { code: 409, message: '只能删除学生未提交的任务', data: null };
  }

  const removeRes = await db.collection('task_items')
    .where({ _id: taskId, child_id, status: 1 })
    .remove();

  if (removeRes.stats.removed === 0) {
    return { code: 409, message: '任务状态已变化，请刷新后重试', data: null };
  }

  return { code: 0, message: 'deleted', data: { task_id: taskId } };
}

async function getTask(userId, taskId, data = {}) {
  const { child_id } = data;
  if (!child_id) {
    return { code: 400, message: '缺少child_id', data: null };
  }

  const taskCheck = await getOwnedTask(userId, taskId, child_id);
  if (taskCheck.error) return taskCheck.error;

  const task = taskCheck.task;
  await attachLatestSubmission(task, child_id);
  return { code: 0, message: 'ok', data: task };
}

async function getTodayTasks(userId, data) {
  const { child_id, date } = data;

  if (!child_id) {
    return { code: 400, message: '缺少child_id', data: null };
  }

  // 验证学生归属
  const childRes = await db.collection('children')
    .where({ _id: child_id, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { code: 404, message: '学生不存在', data: null };
  }

  // 获取今天的日期（如果没有指定）
  const targetDate = date || getTodayDate();

  // 获取该日期的作业批次
  const batchRes = await db.collection('homework_batches')
    .where({ user_id: userId, child_id, batch_date: targetDate })
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

  const taskCheck = await getOwnedTask(userId, taskId, child_id);
  if (taskCheck.error) return taskCheck.error;
  const task = taskCheck.task;

  if (task.status === 2) {
    return { code: 409, message: '任务已完成，不能重复提交', data: null };
  }
  const isModify = task.status === 3;

  const now = db.serverDate();

  const submissionData = {
    task_id: taskId,
    child_id,
    submit_type,
    submit_text: submit_text || null,
    file_asset_id: file_asset_id || null,
    review_status: 1,
    submitted_at: now,
    created_at: now,
  };

  const claimRes = await db.collection('task_items')
    .where({ _id: taskId, child_id, status: _.in([1, 3]) })
    .update({ data: { status: 3, updated_at: now } });

  if (claimRes.stats.updated === 0) {
    return { code: 409, message: '任务状态已变化，请刷新后重试', data: null };
  }

  let submissionId;
  if (isModify) {
    const existingSubmissionRes = await db.collection('task_submissions')
      .where({ task_id: taskId, child_id })
      .orderBy('submitted_at', 'desc')
      .limit(1)
      .get();
    if (existingSubmissionRes.data.length > 0) {
      submissionId = existingSubmissionRes.data[0]._id;
      await db.collection('task_submissions').doc(submissionId).update({
        data: { ...submissionData, updated_at: now },
      });
    }
  }

  if (!submissionId) {
    const submissionRes = await db.collection('task_submissions').add({ data: submissionData });
    submissionId = submissionRes._id;
  }

  const checkData = {
    submission_id: submissionId,
    task_id: taskId,
    check_engine: 'parent_review',
    is_passed: 0,
    score: 0,
    feedback: '提交成功，等待爸爸妈妈检查',
    detail_json: {
      rule: 'parent_review_required_v1',
      expected_answer: task.subject === '数学' && task.expected_answer ? task.expected_answer : null,
    },
    checked_at: null,
    created_at: now,
  };

  const checkResult = await upsertCheckResult(taskId, submissionId, checkData, now);

  return {
    code: 0,
    message: 'submitted_pending_review',
    data: {
      submission: { _id: submissionId, ...submissionData },
      check_result: checkResult,
    },
  };
}

async function reviewTask(userId, taskId, data = {}) {
  const { child_id, approved = true, feedback } = data;
  if (!child_id) {
    return { code: 400, message: '缺少child_id', data: null };
  }

  const taskCheck = await getOwnedTask(userId, taskId, child_id);
  if (taskCheck.error) return taskCheck.error;
  const task = taskCheck.task;

  if (task.status === 2) {
    return { code: 409, message: '任务已完成，无需重复检查', data: null };
  }
  if (task.status !== 3) {
    return { code: 409, message: '任务尚未提交，不能检查', data: null };
  }

  const submissionRes = await db.collection('task_submissions')
    .where({ task_id: taskId, child_id })
    .orderBy('submitted_at', 'desc')
    .limit(1)
    .get();

  if (submissionRes.data.length === 0) {
    return { code: 404, message: '提交记录不存在', data: null };
  }

  const submission = submissionRes.data[0];
  const now = db.serverDate();

  if (!approved) {
    await db.collection('task_items').doc(taskId).update({
      data: { status: 1, updated_at: now },
    });
    await db.collection('task_submissions').doc(submission._id).update({
      data: { review_status: 3, reviewed_at: now, review_feedback: feedback || '请按家长要求补充后重新提交' },
    });
    await upsertCheckResult(taskId, submission._id, {
      check_engine: 'parent_review',
      is_passed: 0,
      score: 40,
      feedback: feedback || '请按家长要求补充后重新提交',
      checked_at: now,
      updated_at: now,
    }, now);
    return { code: 0, message: 'rejected', data: { task_id: taskId, status: 1 } };
  }

  const claimRes = await db.collection('task_items')
    .where({ _id: taskId, child_id, status: 3 })
    .update({ data: { status: 2, updated_at: now } });

  if (claimRes.stats.updated === 0) {
    return { code: 409, message: '任务状态已变化，请刷新后重试', data: null };
  }

  await db.collection('task_submissions').doc(submission._id).update({
    data: { review_status: 2, reviewed_at: now, review_feedback: feedback || '爸爸妈妈已检查通过' },
  });

  const checkResult = await upsertCheckResult(taskId, submission._id, {
    check_engine: 'parent_review',
    is_passed: 1,
    score: 100,
    feedback: feedback || '爸爸妈妈已检查通过，完成得不错！',
    checked_at: now,
    updated_at: now,
  }, now);

  await awardTaskCompletion(child_id, task, now);

  return {
    code: 0,
    message: 'reviewed',
    data: {
      task_id: taskId,
      status: 2,
      check_result: checkResult,
    },
  };
}

async function attachLatestSubmission(task, childId) {
  const submissionRes = await db.collection('task_submissions')
    .where({ task_id: task._id, child_id: childId })
    .orderBy('submitted_at', 'desc')
    .limit(1)
    .get();

  if (submissionRes.data.length === 0) return task;

  task.submission = submissionRes.data[0];
  const checkRes = await db.collection('check_results')
    .where({ submission_id: task.submission._id, task_id: task._id })
    .limit(1)
    .get();
  if (checkRes.data.length > 0) {
    task.submission.check_result = checkRes.data[0];
  }
  return task;
}

async function getOwnedTask(userId, taskId, childId) {
  const childRes = await db.collection('children')
    .where({ _id: childId, user_id: userId })
    .get();

  if (childRes.data.length === 0) {
    return { error: { code: 404, message: '学生不存在', data: null } };
  }

  const taskRes = await db.collection('task_items')
    .where({ _id: taskId, child_id: childId })
    .get();

  if (taskRes.data.length === 0) {
    return { error: { code: 404, message: '任务不存在', data: null } };
  }

  const task = taskRes.data[0];
  if (task.batch_id) {
    const batchRes = await db.collection('homework_batches')
      .where({ _id: task.batch_id, user_id: userId, child_id: childId })
      .get();
    if (batchRes.data.length === 0) {
      return { error: { code: 403, message: '任务归属不匹配', data: null } };
    }
  }

  return { task };
}

async function upsertCheckResult(taskId, submissionId, data, now) {
  const checkRes = await db.collection('check_results')
    .where({ submission_id: submissionId, task_id: taskId })
    .limit(1)
    .get();

  if (checkRes.data.length > 0) {
    await db.collection('check_results').doc(checkRes.data[0]._id).update({ data });
    return { _id: checkRes.data[0]._id, ...checkRes.data[0], ...data };
  }

  const createData = {
    submission_id: submissionId,
    task_id: taskId,
    detail_json: { rule: 'parent_review_required_v1' },
    created_at: now,
    ...data,
  };
  const addRes = await db.collection('check_results').add({ data: createData });
  return { _id: addRes._id, ...createData };
}

async function awardTaskCompletion(childId, task, now) {
  const existingRewardRes = await db.collection('reward_records')
    .where({ child_id: childId, source_type: 'task_complete', source_id: task._id })
    .limit(1)
    .get();

  if (existingRewardRes.data.length === 0) {
    const accountRes = await db.collection('reward_accounts')
      .where({ child_id: childId })
      .get();

    if (accountRes.data.length > 0) {
      await db.collection('reward_accounts').doc(accountRes.data[0]._id).update({
        data: { total_points: _.inc(2), updated_at: now },
      });
    } else {
      await db.collection('reward_accounts').add({
        data: {
          child_id: childId,
          total_points: 2,
          streak_days: 0,
          created_at: now,
          updated_at: now,
        },
      });
    }

    await db.collection('reward_records').add({
      data: {
        child_id: childId,
        source_type: 'task_complete',
        source_id: task._id,
        points: 2,
        description: '完成任务奖励积分',
        created_at: now,
      },
    });
  }

  if (task.batch_id) {
    const batchRes = await db.collection('homework_batches').doc(task.batch_id).get();
    if (batchRes.data) {
      const batchDate = batchRes.data.batch_date;
      const allCount = await db.collection('task_items')
        .where({ batch_id: task.batch_id, child_id: childId })
        .count();
      const doneCount = await db.collection('task_items')
        .where({ batch_id: task.batch_id, child_id: childId, status: 2 })
        .count();

      const totalCount = allCount.total;
      const completedCount = doneCount.total;
      const completionData = {
        total_tasks: totalCount,
        completed_tasks: completedCount,
        is_all_completed: totalCount > 0 && totalCount === completedCount ? 1 : 0,
        updated_at: now,
      };

      const completionRes = await db.collection('daily_completions').where({
        child_id: childId,
        completion_date: batchDate,
      }).get();

      if (completionRes.data.length > 0) {
        await db.collection('daily_completions').doc(completionRes.data[0]._id).update({ data: completionData });
      } else {
        await db.collection('daily_completions').add({
          data: { child_id: childId, completion_date: batchDate, ...completionData, created_at: now },
        });
      }
    }
  }
}

function normalizeAnswer(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[，。；：]/g, match => ({ '，': ',', '。': '.', '；': ';', '：': ':' }[match] || match));
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
