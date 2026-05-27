let mockWxConfig = {};

describe('tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockWxConfig = {
      openid: 'test_openid',
      users: [],
      children: [],
      taskItems: [],
      homeworkBatches: [],
      taskSubmissions: [],
      checkResults: [],
      fileAssets: [],
      rewardAccounts: [],
      rewardRecords: [],
      dailyCompletions: [],
    };
  });

  function setupMock() {
    jest.mock('wx-server-sdk', () => {
      const cfg = mockWxConfig;
      const allData = {
        users: cfg.users,
        children: cfg.children,
        task_items: cfg.taskItems,
        homework_batches: cfg.homeworkBatches,
        task_submissions: cfg.taskSubmissions,
        check_results: cfg.checkResults,
        file_assets: cfg.fileAssets,
        reward_accounts: cfg.rewardAccounts,
        reward_records: cfg.rewardRecords,
        daily_completions: cfg.dailyCompletions,
      };
      return {
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn((name) => {
            const data = allData[name] || [];
            return {
              where: jest.fn((query) => {
                const chain = {
                  get: jest.fn(async () => ({
                    data: data.filter((item) => {
                      return Object.entries(query).every(([k, v]) => {
                        if (v && v._type === 'in') return v.values.includes(item[k]);
                        return item[k] === v;
                      });
                    }),
                  })),
                  count: jest.fn(async () => ({
                    total: data.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v)).length,
                  })),
                  remove: jest.fn(async () => ({
                    stats: {
                      removed: data.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v)).length,
                    },
                  })),
                  update: jest.fn(async (opts) => ({
                    stats: {
                      updated: data.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v)).length,
                    },
                  })),
                  orderBy: jest.fn(() => chain),
                  limit: jest.fn(() => chain),
                };
                return chain;
              }),
              add: jest.fn(async (opts) => ({
                _id: `new_${name}_${Date.now()}`,
                ...opts.data,
              })),
              doc: jest.fn((id) => ({
                get: jest.fn(async () => ({
                  data: data.find((item) => item._id === id) || null,
                })),
                update: jest.fn(async () => ({ stats: { updated: 1 } })),
                remove: jest.fn(async () => ({ stats: { removed: 1 } })),
              })),
            };
          }),
          serverDate: jest.fn(() => ({ _type: 'serverDate' })),
          command: {
            in: jest.fn((arr) => ({ _type: 'in', values: arr })),
            inc: jest.fn((n) => ({ _type: 'inc', value: n })),
          },
        })),
        getWXContext: jest.fn(() => ({ OPENID: cfg.openid })),
      };
    });
  }

  test('returns 401 when user not found', async () => {
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'today', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(401);
    expect(result.message).toBe('未登录');
  });

  test('returns 400 for unknown action', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'unknown' }, {});
    expect(result.code).toBe(400);
    expect(result.message).toBe('未知操作');
  });

  test('today returns 400 when child_id missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'today', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('child_id');
  });

  test('today returns 404 when child not found', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'today', data: { child_id: 'nonexistent' } }, {});
    expect(result.code).toBe(404);
    expect(result.message).toBe('学生不存在');
  });

  test('today returns empty array when no batches', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    mockWxConfig.homeworkBatches = [];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'today', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(0);
    expect(result.data).toEqual([]);
  });

  test('get returns 400 when child_id missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'get', id: 'task1', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('child_id');
  });

  test('get attaches latest submission file asset', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    mockWxConfig.homeworkBatches = [{ _id: 'b1', user_id: 'u1', child_id: 'c1' }];
    mockWxConfig.taskItems = [{ _id: 't1', child_id: 'c1', batch_id: 'b1', status: 3 }];
    mockWxConfig.taskSubmissions = [
      { _id: 's1', task_id: 't1', child_id: 'c1', file_asset_id: 'fa1', submit_type: 2, submitted_at: '2026-01-01' },
    ];
    mockWxConfig.fileAssets = [
      { _id: 'fa1', child_id: 'c1', fileID: 'cloud://env/uploads/task_submission/c1/1.jpg', file_ext: 'jpg' },
    ];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'get', id: 't1', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(0);
    expect(result.data.submission.file_asset.fileID).toContain('task_submission');
  });

  test('delete returns 400 when child_id missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'delete', id: 'task1', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('child_id');
  });

  test('submit returns 400 when required params missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    mockWxConfig.taskItems = [{ _id: 't1', child_id: 'c1', status: 1, batch_id: 'b1' }];
    mockWxConfig.homeworkBatches = [{ _id: 'b1', user_id: 'u1', child_id: 'c1' }];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'submit',
        id: 't1',
        data: { child_id: 'c1' },
      },
      {},
    );
    expect(result.code).toBe(400);
    expect(result.message).toContain('必要参数');
  });

  test('review returns 400 when child_id missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'review', id: 'task1', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('child_id');
  });
});
