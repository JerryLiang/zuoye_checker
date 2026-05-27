let mockWxConfig = {};

describe('children', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockWxConfig = { openid: 'test_openid', users: [], children: [] };
  });

  function setupMock() {
    jest.mock('wx-server-sdk', () => {
      const { openid, users, children } = mockWxConfig;
      return {
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn((name) => {
            const dataMap = { users, children };
            const data = dataMap[name] || [];
            return {
              where: jest.fn((query) => ({
                get: jest.fn(async () => ({
                  data: data.filter((item) => {
                    return Object.entries(query).every(([k, v]) => item[k] === v);
                  }),
                })),
                count: jest.fn(async () => ({ total: data.length })),
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
                orderBy: jest.fn(() => ({
                  get: jest.fn(async () => ({
                    data: data.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v)),
                  })),
                })),
              })),
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
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => ({ _type: 'serverDate' })),
        })),
        getWXContext: jest.fn(() => ({ OPENID: openid })),
      };
    });
  }

  test('returns 401 when openid is missing', async () => {
    mockWxConfig = { openid: '', users: [], children: [] };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'list' }, {});
    expect(result.code).toBe(401);
  });

  test('returns 400 for unknown action', async () => {
    mockWxConfig = {
      openid: 'test_openid',
      users: [{ _id: 'u1', openid: 'test_openid' }],
      children: [],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'unknown' }, {});
    expect(result.code).toBe(400);
    expect(result.message).toBe('未知操作');
  });

  test('list returns children for user', async () => {
    mockWxConfig = {
      openid: 'test_openid',
      users: [{ _id: 'u1', openid: 'test_openid', nickname: 'parent' }],
      children: [
        { _id: 'c1', user_id: 'u1', name: 'Child A' },
        { _id: 'c2', user_id: 'u1', name: 'Child B' },
      ],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'list' }, {});
    expect(result.code).toBe(0);
    expect(result.data.length).toBe(2);
  });

  test('get returns 404 for non-existent child', async () => {
    mockWxConfig = {
      openid: 'test_openid',
      users: [{ _id: 'u1', openid: 'test_openid' }],
      children: [],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'get', id: 'nonexistent' }, {});
    expect(result.code).toBe(404);
  });

  test('create returns created child with id', async () => {
    mockWxConfig = {
      openid: 'test_openid',
      users: [{ _id: 'u1', openid: 'test_openid' }],
      children: [],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: { name: 'New Child', age_group: '6-8', grade: '一年级' },
      },
      {},
    );
    expect(result.code).toBe(0);
    expect(result.message).toBe('created');
    expect(result.data.name).toBe('New Child');
  });

  test('create sets default gender to null', async () => {
    mockWxConfig = {
      openid: 'test_openid',
      users: [{ _id: 'u1', openid: 'test_openid' }],
      children: [],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: { name: 'Child', age_group: '6-8' },
      },
      {},
    );
    expect(result.data.gender).toBeNull();
    expect(result.data.birth_date).toBeNull();
  });

  test('delete returns 404 for non-existent child', async () => {
    mockWxConfig = {
      openid: 'test_openid',
      users: [{ _id: 'u1', openid: 'test_openid' }],
      children: [],
    };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'delete', id: 'nonexistent' }, {});
    expect(result.code).toBe(404);
  });

  test('handles errors gracefully', async () => {
    jest.mock('wx-server-sdk', () => ({
      init: jest.fn(),
      DYNAMIC_CURRENT_ENV: 'test-env',
      database: jest.fn(() => ({
        collection: jest.fn(() => {
          throw new Error('db connection failed');
        }),
        createCollection: jest.fn(async () => ({})),
        serverDate: jest.fn(() => new Date()),
      })),
      getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
    }));

    const { main } = require('../index');
    const result = await main({ action: 'list' }, {});
    expect(result.code).toBe(500);
    expect(result.message).toBe('服务暂时不可用');
  });
});
