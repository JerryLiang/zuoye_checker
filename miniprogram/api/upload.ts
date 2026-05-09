export interface FileAsset {
  _id: string;
  fileID: string;
}

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'];

export const uploadApi = {
  async upload(filePath: string, bizType: 'homework_input' | 'task_submission', childId: string) {
    if (!childId) {
      throw new Error('缺少学生信息');
    }

    const timestamp = Date.now();
    const rawExt = (filePath.split('.').pop() || 'jpg').toLowerCase();
    const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : 'jpg';

    const cloudPath = `uploads/${bizType}/${childId}/${timestamp}.${ext}`;

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath,
    });

    const assetRes = await wx.cloud.callFunction({
      name: 'file-assets',
      data: {
        action: 'create',
        data: {
          fileID: uploadRes.fileID,
          biz_type: bizType,
          child_id: childId,
          file_name: filePath.split('/').pop() || null,
          file_ext: ext,
        },
      },
    });

    const result = assetRes.result as { code: number; message: string; data: FileAsset };
    if (result.code !== 0) {
      throw new Error(result.message || '文件记录保存失败');
    }

    return result.data;
  },
};
