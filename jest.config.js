/** @type {import('jest').Config} */
module.exports = {
  testMatch: ['<rootDir>/cloudfunctions/**/__tests__/**/*.test.js'],
  testEnvironment: 'node',
  collectCoverageFrom: ['cloudfunctions/*/index.js', '!cloudfunctions/**/node_modules/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  verbose: true,
  moduleNameMapper: {
    '^wx-server-sdk$': '<rootDir>/cloudfunctions/__mocks__/wx-server-sdk.js',
  },
};
