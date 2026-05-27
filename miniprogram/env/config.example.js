"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configs = {
    dev: {
        cloudEnvId: 'your-dev-env-id',
    },
    staging: {
        cloudEnvId: 'your-staging-env-id',
    },
    prod: {
        cloudEnvId: 'your-prod-env-id',
    },
};
// 修改此处切换环境: 'dev' | 'staging' | 'prod'
const ENV = 'dev';
exports.default = configs[ENV] || configs.dev;
