let mockWxConfig = {};

describe('homeworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockWxConfig = { openid: 'test_openid' };
  });

  function setupMock() {
    jest.mock('wx-server-sdk', () => {
      const cfg = mockWxConfig;
      return {
        init: jest.fn(),
        DYNAMIC_CURRENT_ENV: 'test-env',
        database: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(async () => ({ data: [] })),
              count: jest.fn(async () => ({ total: 0 })),
              remove: jest.fn(async () => ({ stats: { removed: 0 } })),
              update: jest.fn(async () => ({ stats: { updated: 0 } })),
              orderBy: jest.fn(() => ({
                get: jest.fn(async () => ({ data: [] })),
                orderBy: jest.fn(() => ({
                  get: jest.fn(async () => ({ data: [] })),
                })),
              })),
            })),
            add: jest.fn(async (opts) => ({
              _id: `new_${Date.now()}`,
              ...opts.data,
            })),
            doc: jest.fn(() => ({
              get: jest.fn(async () => ({ data: null })),
              update: jest.fn(async () => ({ stats: { updated: 1 } })),
              remove: jest.fn(async () => ({ stats: { removed: 1 } })),
            })),
          })),
          createCollection: jest.fn(async () => ({})),
          serverDate: jest.fn(() => ({ _type: 'serverDate' })),
        })),
        getWXContext: jest.fn(() => ({ OPENID: cfg.openid })),
        downloadFile: jest.fn(),
      };
    });
  }

  test('returns 401 when openid is missing', async () => {
    mockWxConfig = { openid: '' };
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'list' }, {});
    expect(result.code).toBe(401);
  });

  test('returns 400 for unknown action', async () => {
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'unknown' }, {});
    expect(result.code).toBe(400);
    expect(result.message).toBe('未知操作');
  });

  test('create returns 400 when child_id missing', async () => {
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'create', data: { batch_date: '2025-01-01' } }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('必要参数');
  });

  test('create returns 400 when batch_date missing', async () => {
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'create', data: { child_id: 'c1' } }, {});
    expect(result.code).toBe(400);
  });

  test('create returns 400 when too many file_asset_ids', async () => {
    const mockCollection = jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(async () => ({
          data: [{ _id: 'c1', user_id: 'u1' }],
        })),
      })),
      add: jest.fn(async (opts) => ({ _id: `new_${Date.now()}`, ...opts.data })),
    }));
    jest.mock('wx-server-sdk', () => ({
      init: jest.fn(),
      DYNAMIC_CURRENT_ENV: 'test-env',
      database: jest.fn(() => ({
        collection: mockCollection,
        createCollection: jest.fn(async () => ({})),
        serverDate: jest.fn(() => ({ _type: 'serverDate' })),
      })),
      getWXContext: jest.fn(() => ({ OPENID: 'test_openid' })),
      downloadFile: jest.fn(),
    }));
    const { main } = require('../index');
    const result = await main(
      {
        action: 'create',
        data: {
          child_id: 'c1',
          batch_date: '2025-01-01',
          file_asset_ids: ['1', '2', '3', '4', '5', '6'],
        },
      },
      {},
    );
    expect(result.code).toBe(400);
    expect(result.message).toContain('5张');
  });

  test('recognize_image returns 400 when file_asset_id missing', async () => {
    setupMock();
    const { main } = require('../index');
    const result = await main({ action: 'recognize_image', data: {} }, {});
    expect(result.code).toBe(400);
    expect(result.message).toContain('file_asset_id');
  });

  describe('normalizeTaskItems (pure logic)', () => {
    function normalizeTaskItems(data = {}) {
      const allowedSubjects = ['语文', '数学', '英语', '其他'];
      if (Array.isArray(data.task_items) && data.task_items.length > 0) {
        const items = data.task_items
          .map((item) => ({
            subject: allowedSubjects.includes(item.subject) ? item.subject : data.subject || '其他',
            text: String(item.text || '').trim(),
          }))
          .filter((item) => item.text);
        if (items.length > 0) return items;
      }
      const raw = String(data.raw_text || '').trim();
      const segments = raw
        ? raw
            .split(/[\n\r]+|[。；;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      if (segments.length === 0) {
        return [{ subject: data.subject || '其他', text: '完成老师布置的作业' }];
      }
      return segments.map((text) => ({ subject: data.subject || '其他', text }));
    }

    test('parses task_items array when provided', () => {
      const result = normalizeTaskItems({
        task_items: [
          { subject: '数学', text: '口算题' },
          { subject: '语文', text: '抄写生字' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0].subject).toBe('数学');
      expect(result[1].text).toBe('抄写生字');
    });

    test('falls back to raw_text splitting by newline', () => {
      const result = normalizeTaskItems({ raw_text: '口算题\n抄写生字', subject: '数学' });
      expect(result).toHaveLength(2);
      expect(result[0].subject).toBe('数学');
    });

    test('splits raw_text by Chinese punctuation', () => {
      const result = normalizeTaskItems({ raw_text: '口算题；抄写生字', subject: '语文' });
      expect(result).toHaveLength(2);
    });

    test('returns default item when no input', () => {
      const result = normalizeTaskItems({});
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('完成老师布置的作业');
      expect(result[0].subject).toBe('其他');
    });

    test('uses default subject when task_items subject is invalid', () => {
      const result = normalizeTaskItems({
        subject: '英语',
        task_items: [{ subject: '物理', text: '做实验' }],
      });
      expect(result[0].subject).toBe('英语');
    });

    test('filters out empty text items', () => {
      const result = normalizeTaskItems({
        task_items: [
          { subject: '数学', text: '口算题' },
          { subject: '数学', text: '' },
          { subject: '数学', text: '  ' },
        ],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('normalizeRecognitionResult (pure logic)', () => {
    function normalizeRecognitionResult(result = {}) {
      const allowedSubjects = ['语文', '数学', '英语', '其他'];
      const subject = allowedSubjects.includes(result.subject) ? result.subject : '其他';
      const batchDate = /^\d{4}-\d{2}-\d{2}$/.test(result.batch_date || '') ? result.batch_date : null;
      const rawLines = String(result.raw_text || '')
        .split(/[\n\r]+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const rawText = rawLines.join('\n');
      function normalizeRecognitionItems(items, rawLines, fallbackSubject) {
        if (Array.isArray(items) && items.length > 0) {
          const normalized = items
            .map((item) => ({
              subject: allowedSubjects.includes(item.subject) ? item.subject : fallbackSubject,
              text: String(item.text || '').trim(),
            }))
            .filter((item) => item.text);
          if (normalized.length > 0) return normalized;
        }
        return rawLines.map((text) => ({ subject: fallbackSubject, text }));
      }
      const recognizedItems = normalizeRecognitionItems(result.recognized_items, rawLines, subject);
      return {
        subject,
        batch_date: batchDate,
        raw_text: rawText,
        recognized_items: recognizedItems,
        confidence: Number(result.confidence || 0),
        provider_message:
          result.provider_message ||
          (recognizedItems.length === 0 ? '未识别到作业内容，请换一张更清晰的图片' : undefined),
      };
    }

    test('normalizes valid result', () => {
      const result = normalizeRecognitionResult({
        subject: '数学',
        batch_date: '2025-01-15',
        raw_text: '1+1=?\n2+2=?',
        recognized_items: [
          { subject: '数学', text: '1+1=?' },
          { subject: '数学', text: '2+2=?' },
        ],
        confidence: 0.95,
      });
      expect(result.subject).toBe('数学');
      expect(result.batch_date).toBe('2025-01-15');
      expect(result.recognized_items).toHaveLength(2);
      expect(result.confidence).toBe(0.95);
    });

    test('defaults subject to 其他 for invalid values', () => {
      expect(normalizeRecognitionResult({ subject: '物理' }).subject).toBe('其他');
    });

    test('returns null batch_date for invalid format', () => {
      expect(normalizeRecognitionResult({ batch_date: '2025/01/15' }).batch_date).toBeNull();
    });

    test('returns empty recognized_items for empty input', () => {
      const result = normalizeRecognitionResult({});
      expect(result.recognized_items).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    test('provides fallback message when no items recognized', () => {
      expect(normalizeRecognitionResult({}).provider_message).toContain('未识别到');
    });
  });
});
