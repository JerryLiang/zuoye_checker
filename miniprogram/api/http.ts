type CloudFunctionName = 'auth-login' | 'children' | 'homeworks' | 'tasks' | 'rewards' | 'reports';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

async function callCloud<T = any>(name: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
  try {
    const res = await wx.cloud.callFunction({
      name,
      data,
    });
    return res.result as ApiResponse<T>;
  } catch (err: any) {
    return {
      code: 500,
      message: err.message || '云函数调用失败',
      data: null as any,
    };
  }
}

export const http = {
  // 兼容旧接口，实际调用云函数
  get: <T = any>(path: string, data?: Record<string, any>) => {
    const [resource, action] = path.split('/').filter(Boolean);
    const funcName = resource as string;
    const actionName = action || 'list';
    return callCloud<T>(funcName, { action: actionName, data, id: action && !isNaN(Number(action)) ? action : undefined });
  },

  post: <T = any>(path: string, data?: Record<string, any>) => {
    const parts = path.split('/').filter(Boolean);
    const funcName = parts[0];

    // 特殊处理提交任务
    if (funcName === 'tasks' && parts.length >= 3 && parts[2] === 'submit') {
      return callCloud<T>(funcName, { action: 'submit', id: parts[1], data });
    }

    return callCloud<T>(funcName, { action: 'create', data });
  },

  put: <T = any>(path: string, data?: Record<string, any>) => {
    const parts = path.split('/').filter(Boolean);
    const funcName = parts[0];
    return callCloud<T>(funcName, { action: 'update', id: parts[1], data });
  },

  patch: <T = any>(path: string, data?: Record<string, any>) => {
    const parts = path.split('/').filter(Boolean);
    const funcName = parts[0];
    return callCloud<T>(funcName, { action: 'update', id: parts[1], data });
  },

  del: <T = any>(path: string, data?: Record<string, any>) => {
    const parts = path.split('/').filter(Boolean);
    const funcName = parts[0];
    return callCloud<T>(funcName, { action: 'delete', id: parts[1], data });
  },
};
