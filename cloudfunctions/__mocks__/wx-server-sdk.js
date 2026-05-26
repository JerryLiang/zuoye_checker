module.exports = {
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'test-env',
  database: jest.fn(),
  getWXContext: jest.fn(() => ({ OPENID: '' })),
  downloadFile: jest.fn(),
};
