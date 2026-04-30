import { http } from './http';

export interface FileAsset {
  id: number;
  storage_path: string;
}

export const uploadApi = {
  upload(filePath: string, bizType: 'homework_input' | 'task_submission', childId?: number) {
    const app = getApp<IAppOption>();
    const url = `${app.globalData.baseURL}/upload`;

    return new Promise<FileAsset>((resolve, reject) => {
      wx.uploadFile({
        url,
        filePath,
        name: 'file',
        header: {
          Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
        },
        formData: {
          biz_type: bizType,
          ...(childId ? { child_id: String(childId) } : {}),
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const body = JSON.parse(res.data);
            if (body.code === 0) {
              resolve(body.data);
              return;
            }
            reject(body);
            return;
          }
          reject(res);
        },
        fail: reject,
      });
    });
  },
};

interface IAppOption {
  globalData: {
    baseURL: string;
    token: string;
    userId: number;
    currentChildId: number;
  };
}
