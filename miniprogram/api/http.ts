type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

function request<T = any>(method: RequestMethod, path: string, data?: Record<string, any>, header: Record<string, string> = {}) {
  const app = getApp<IAppOption>();
  const url = `${app.globalData.baseURL}${path}`;

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header: {
        'content-type': 'application/json',
        Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
        ...header,
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>;
        if (res.statusCode >= 200 && res.statusCode < 300 && body && typeof body.code === 'number') {
          resolve(body);
          return;
        }
        reject(body || res);
      },
      fail: reject,
    });
  });
}

export const http = {
  get: <T = any>(path: string, data?: Record<string, any>) => request<T>('GET', path, data),
  post: <T = any>(path: string, data?: Record<string, any>) => request<T>('POST', path, data),
  put: <T = any>(path: string, data?: Record<string, any>) => request<T>('PUT', path, data),
  patch: <T = any>(path: string, data?: Record<string, any>) => request<T>('PATCH', path, data),
  del: <T = any>(path: string, data?: Record<string, any>) => request<T>('DELETE', path, data),
};

interface IAppOption {
  globalData: {
    baseURL: string;
    token: string;
    userId: number;
    currentChildId: number;
  };
}
