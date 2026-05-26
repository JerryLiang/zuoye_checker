let mockWxConfig = {};

describe('reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockWxConfig = {
      openid: 'test_openid',
      users: [],
      children: [],
      homeworkBatches: [],
      taskItems: [],
      checkResults: [],
      rewardRecords: [],
    };
  });

  function setupMock() {
    jest.mock('wx-server-sdk', () => {
      const cfg = mockWxConfig;
      const allData = {
        users: cfg.users,
        children: cfg.children,
        homework_batches: cfg.homeworkBatches,
        task_items: cfg.taskItems,
        check_results: cfg.checkResults,
        reward_records: cfg.rewardRecords,
      };

      function matchesQuery(item, query) {
        return Object.entries(query).every(([k, v]) => {
          if (v && v._type === 'in') return v.values.includes(item[k]);
          if (v && v._type === 'and') {
            const leftOk = v.left._type === 'gte' ? item[k] >= v.left.value : true;
            const rightOk = v.right._type === 'lte' ? item[k] <= v.right.value : true;
            return leftOk && rightOk;
          }
          if (v && v._type === 'gte') return item[k] >= v.value;
          if (v && v._type === 'lte') return item[k] <= v.value;
          if (v && v._type === 'lt') return item[k] < v.value;
          return item[k] === v;
        });
      }

      function makeQueryChain(data, query) {
        const filtered = data.filter((item) => matchesQuery(item, query));
        const chain = {
          get: jest.fn(async () => ({ data: filtered })),
          count: jest.fn(async () => ({ total: filtered.length })),
        };
        chain.orderBy = jest.fn(() => chain);
        chain.limit = jest.fn(() => chain);
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
              add: jest.fn(async (opts) => ({ _id: `new_${Date.now()}`, ...opts.data })),
            };
          }),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => ({ _type: 'serverDate' })),
          command: {
            in: jest.fn((arr) => ({ _type: 'in', values: arr })),
            gte: jest.fn((v) => ({
              _type: 'gte',
              value: v,
              and: jest.fn((other) => ({ _type: 'and', left: { _type: 'gte', value: v }, right: other })),
            })),
            lte: jest.fn((v) => ({ _type: 'lte', value: v })),
            lt: jest.fn((v) => ({ _type: 'lt', value: v })),
            inc: jest.fn((n) => ({ _type: 'inc', value: n })),
          },
        })),
        getWXContext: jest.fn(() => ({ OPENID: cfg.openid })),
      };
    });
  }

  test('returns 401 when openid is missing', async () => {
    mockWxConfig = {
      openid: '',
      users: [],
      children: [],
      homeworkBatches: [],
      taskItems: [],
      checkResults: [],
      rewardRecords: [],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'weekly', data: {} }, {});
    expect(result.code).toBe(401);
  });

  test('returns 400 for unknown action', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'unknown', data: {} }, {});
    expect(result.code).toBe(400);
  });

  test('weekly returns 400 when child_id missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'weekly', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('child_id');
  });

  test('weekly returns 404 when child not found', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'weekly', data: { child_id: 'nonexistent' } }, {});
    expect(result.code).toBe(404);
  });

  test('weekly returns report with correct structure', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'weekly', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(0);
    expect(result.data).toHaveProperty('child_id', 'c1');
    expect(result.data).toHaveProperty('week_start');
    expect(result.data).toHaveProperty('week_end');
    expect(result.data).toHaveProperty('summary');
    expect(result.data).toHaveProperty('daily_stats');
    expect(result.data.daily_stats).toHaveLength(7);
    expect(result.data.summary).toHaveProperty('total_tasks');
    expect(result.data.summary).toHaveProperty('completed_tasks');
    expect(result.data.summary).toHaveProperty('completion_rate');
  });
});
