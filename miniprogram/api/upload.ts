export interface FileAsset {
  _id: string;
  fileID: string;
}

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'];
export const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;

export const uploadApi = {
  async upload(filePath: string, bizType: 'homework_input' | 'task_submission', childId: string) {
    if (!childId) {
      throw new Error('缺少学生信息');
    }

    const fileInfo = await (wx as any).getFileInfo({ filePath });
    if ((fileInfo.size || 0) > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error('单张图片不能超过10M');
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
          file_size: fileInfo.size || 0,
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
