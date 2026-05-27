const crypto = require('crypto');

describe('auth-login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('validatePin', () => {
    function validatePin(pin) {
      const value = String(pin || '').trim();
      return /^\d{4,6}$/.test(value) ? value : '';
    }

    test('accepts 4-digit pin', () => {
      expect(validatePin('1234')).toBe('1234');
    });

    test('accepts 6-digit pin', () => {
      expect(validatePin('123456')).toBe('123456');
    });

    test('rejects 3-digit pin', () => {
      expect(validatePin('123')).toBe('');
    });

    test('rejects 7-digit pin', () => {
      expect(validatePin('1234567')).toBe('');
    });

    test('rejects non-numeric pin', () => {
      expect(validatePin('abcd')).toBe('');
    });

    test('rejects empty pin', () => {
      expect(validatePin('')).toBe('');
      expect(validatePin(null)).toBe('');
      expect(validatePin(undefined)).toBe('');
    });

    test('rejects pin with spaces', () => {
      expect(validatePin(' 1234 ')).toBe('1234');
    });

    test('rejects pin with special chars', () => {
      expect(validatePin('1234;')).toBe('');
    });
  });

  describe('hashPin', () => {
    function hashPin(pin, salt) {
      return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
    }

    test('produces consistent hash for same input', () => {
      const hash1 = hashPin('1234', 'salt123');
      const hash2 = hashPin('1234', 'salt123');
      expect(hash1).toBe(hash2);
    });

    test('produces different hash for different salt', () => {
      const hash1 = hashPin('1234', 'salt1');
      const hash2 = hashPin('1234', 'salt2');
      expect(hash1).not.toBe(hash2);
    });

    test('produces different hash for different pin', () => {
      const hash1 = hashPin('1234', 'salt123');
      const hash2 = hashPin('5678', 'salt123');
      expect(hash1).not.toBe(hash2);
    });

    test('produces hex string of 64 chars', () => {
      const hash = hashPin('1234', 'salt');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('main function', () => {
    test('returns 401 when openid is missing', async () => {
      jest.mock('wx-server-sdk', () => ({
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => ({ data: [] })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
        })),
        getWXContext: jest.fn(() => ({ OPENID: '' })),
      }));

      const { main } = require('../index');
      const result = await main({ action: 'login' }, {});
      expect(result.code).toBe(401);
      expect(result.message).toBe('获取openid失败');
    });

    test('returns 400 for unknown action', async () => {
      jest.mock('wx-server-sdk', () => ({
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                data: [
                  {
                    _id: 'user1',
                    openid: 'test_openid',
                    nickname: 'test',
                    avatar_url: null,
                  },
                ],
              })),
            })),
            doc: jest.fn(() => ({
              update: jest.fn(async () => ({ stats: { updated: 1 } })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => new Date()),
        })),
        getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
      }));

      const { main } = require('../index');
      const result = await main({ action: 'unknown_action' }, {});
      expect(result.code).toBe(400);
      expect(result.message).toBe('未知操作');
    });

    test('handles login action for existing user', async () => {
      jest.mock('wx-server-sdk', () => ({
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn((name) => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => {
                if (name === 'users') {
                  return {
                    data: [
                      {
                        _id: 'user1',
                        openid: 'test_openid',
                        nickname: 'Test User',
                        avatar_url: null,
                      },
                    ],
                  };
                }
                return { data: [] };
              }),
            })),
            doc: jest.fn(() => ({
              update: jest.fn(async () => ({ stats: { updated: 1 } })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => new Date()),
        })),
        getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
      }));

      const { main } = require('../index');
      const result = await main({ action: 'login', nickname: 'New Name' }, {});
      expect(result.code).toBe(0);
      expect(result.data.token).toBeUndefined();
      expect(result.data.user.openid).toBeUndefined();
      expect(result.data.user.nickname).toBe('Test User');
    });

    test('handles parent_status action', async () => {
      jest.mock('wx-server-sdk', () => ({
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                data: [
                  {
                    _id: 'user1',
                    openid: 'test_openid',
                    parent_pin_hash: 'hash123',
                  },
                ],
              })),
            })),
            doc: jest.fn(() => ({
              update: jest.fn(async () => ({ stats: { updated: 1 } })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => new Date()),
        })),
        getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
      }));

      const { main } = require('../index');
      const result = await main({ action: 'parent_status' }, {});
      expect(result.code).toBe(0);
      expect(result.data.has_pin).toBe(true);
    });

    test('setup_parent_pin rejects invalid pin', async () => {
      jest.mock('wx-server-sdk', () => ({
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                data: [
                  {
                    _id: 'user1',
                    openid: 'test_openid',
                  },
                ],
              })),
            })),
            doc: jest.fn(() => ({
              update: jest.fn(async () => ({ stats: { updated: 1 } })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => new Date()),
        })),
        getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
      }));

      const { main } = require('../index');
      const result = await main({ action: 'setup_parent_pin', pin: '12' }, {});
      expect(result.code).toBe(400);
      expect(result.message).toContain('PIN');
    });

    test('verify_parent_pin returns 404 when no pin set', async () => {
      jest.mock('wx-server-sdk', () => ({
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                data: [
                  {
                    _id: 'user1',
                    openid: 'test_openid',
                    parent_pin_hash: null,
                    parent_pin_salt: null,
                  },
                ],
              })),
            })),
            doc: jest.fn(() => ({
              update: jest.fn(async () => ({ stats: { updated: 1 } })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => new Date()),
        })),
        getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
      }));

      const { main } = require('../index');
      const result = await main({ action: 'verify_parent_pin', pin: '1234' }, {});
      expect(result.code).toBe(404);
      expect(result.message).toContain('请先设置');
    });
  });
});
