let mockWxConfig = {};

describe('file-assets', () => {
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
            const dataMap = { users, children, file_assets: [] };
            const data = dataMap[name] || [];
            return {
              where: jest.fn((query) => ({
                get: jest.fn(async () => ({
                  data: data.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v)),
                })),
              })),
              add: jest.fn(async (opts) => ({
                _id: `new_${Date.now()}`,
                ...opts.data,
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
    const result = await main({ action: 'create', data: {} }, {});
    expect(result.code).toBe(401);
  });

  test('returns 400 for unknown action', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'unknown', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toBe('未知操作');
  });

  test('create returns 400 when required params missing', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'create', data: { fileID: 'f1' } }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('必要参数');
  });

  test('create returns 400 for invalid biz_type', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: { fileID: 'f1', biz_type: 'invalid', child_id: 'c1' },
      },
      {},
    );
    expect(result.code).toBe(400);
    expect(result.message).toContain('业务类型');
  });

  test('create returns 400 for file too large', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: {
          fileID: '/uploads/homework_input/c1/test.jpg',
          biz_type: 'homework_input',
          child_id: 'c1',
          file_ext: 'jpg',
          file_size: 11 * 1024 * 1024,
        },
      },
      {},
    );
    expect(result.code).toBe(400);
    expect(result.message).toContain('10M');
  });

  test('create returns 400 for unsupported file ext', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: {
          fileID: '/uploads/homework_input/c1/test.exe',
          biz_type: 'homework_input',
          child_id: 'c1',
          file_ext: 'exe',
          file_size: 1024,
        },
      },
      {},
    );
    expect(result.code).toBe(400);
    expect(result.message).toContain('类型');
  });

  test('create returns 400 when file path does not match biz params', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: {
          fileID: '/uploads/wrong/c1/test.jpg',
          biz_type: 'homework_input',
          child_id: 'c1',
          file_ext: 'jpg',
          file_size: 1024,
        },
      },
      {},
    );
    expect(result.code).toBe(400);
    expect(result.message).toContain('不匹配');
  });

  test('create returns 404 when child not found', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: {
          fileID: '/uploads/homework_input/c1/test.jpg',
          biz_type: 'homework_input',
          child_id: 'c1',
          file_ext: 'jpg',
          file_size: 1024,
        },
      },
      {},
    );
    expect(result.code).toBe(404);
  });

  test('create succeeds with valid params', async () => {
    mockWxConfig.users = [{ _id: 'u1', openid: 'test_openid' }];
    mockWxConfig.children = [{ _id: 'c1', user_id: 'u1' }];
    setupMock();
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: {
          fileID: '/uploads/homework_input/c1/test.jpg',
          biz_type: 'homework_input',
          child_id: 'c1',
          file_name: 'test.jpg',
          file_ext: 'jpg',
          file_size: 1024,
        },
      },
      {},
    );
    expect(result.code).toBe(0);
    expect(result.message).toBe('created');
  });
});
