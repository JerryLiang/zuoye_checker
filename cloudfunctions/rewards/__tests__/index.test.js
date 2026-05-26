let mockWxConfig = {};

describe('rewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockWxConfig = {
      openid: 'test_openid',
      users: [],
      children: [],
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
        reward_accounts: cfg.rewardAccounts,
        reward_records: cfg.rewardRecords,
        daily_completions: cfg.dailyCompletions,
      };

      function makeQueryChain(data, query) {
        const filtered = data.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v));
        const chain = {
          get: jest.fn(async () => ({ data: filtered })),
          limit: jest.fn(() => ({
            get: jest.fn(async () => ({ data: filtered })),
          })),
        };
        chain.orderBy = jest.fn(() => chain);
        return chain;
      }

      return {
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn((name) => {
            const data = allData[name] || [];
            return {
              where: jest.fn((query) => makeQueryChain(data, query)),
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn(async () => ({ data })),
                })),
              })),
            };
          }),
          serverDate: jest.fn(() => ({ _type: 'serverDate' })),
        })),
        getWXContext: jest.fn(() => ({ OPENID: cfg.openid })),
      };
    });
  }

  test('returns 401 when user not found', async () => {
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'overview', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(401);
  });

  test('returns 400 for unknown action', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'unknown', data: {} }, {});
    expect(result.code).toBe(400);
  });

  test('overview returns 400 when child_id missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'overview', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('child_id');
  });

  test('overview returns 404 when child not found', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'overview', data: { child_id: 'nonexistent' } }, {});
    expect(result.code).toBe(404);
  });

  test('overview returns data with correct structure', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    mockWxConfig.rewardAccounts = [{ _id: 'ra1', child_id: 'c1', total_points: 10, streak_days: 3 }];
    mockWxConfig.rewardRecords = [{ _id: 'r1', child_id: 'c1', points: 2, source_type: 'task_complete' }];
    mockWxConfig.dailyCompletions = [
      {
        _id: 'dc1',
        child_id: 'c1',
        completion_date: new Date().toISOString().slice(0, 10),
        total_tasks: 3,
        completed_tasks: 2,
        is_all_completed: 0,
      },
    ];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'overview', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(0);
    expect(result.data).toHaveProperty('account');
    expect(result.data).toHaveProperty('records');
    expect(result.data).toHaveProperty('total_points');
    expect(result.data).toHaveProperty('streak_days');
    expect(result.data).toHaveProperty('today_completion');
    expect(result.data).toHaveProperty('recent_records');
    expect(result.data.total_points).toBe(10);
  });

  test('overview defaults to zero when no account exists', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'overview', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(0);
    expect(result.data.total_points).toBe(0);
    expect(result.data.streak_days).toBe(0);
    expect(result.data.today_completion.total_tasks).toBe(0);
  });
});
