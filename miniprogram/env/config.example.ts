export interface EnvConfig {
  cloudEnvId: string;
}

const configs: Record<string, EnvConfig> = {
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
const ENV = 'dev' as keyof typeof configs;

export default configs[ENV] || configs.dev;
