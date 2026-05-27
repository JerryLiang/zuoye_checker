'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const configs = {
  dev: {
    cloudEnvId: 'your-dev-env-id',
  },
  staging: {
    cloudEnvId: 'your-staging-env-id',
  },
  prod: {
    cloudEnvId: 'cloud1-d4gyfebz80ad004bf',
  },
};
// 修改此处切换环境: 'dev' | 'staging' | 'prod'
const ENV = 'prod';
exports.default = configs[ENV] || configs.prod;
