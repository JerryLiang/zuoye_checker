export interface FileAsset {
  _id: string;
  fileID: string;
}

export const uploadApi = {
  async upload(filePath: string, bizType: 'homework_input' | 'task_submission', childId?: string) {
    // 上传文件到云存储
    const timestamp = Date.now();
    const ext = filePath.split('.').pop() || 'jpg';
    const cloudPath = `uploads/${bizType}/${timestamp}.${ext}`;

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath,
    });

    // 保存文件记录到数据库
    const db = wx.cloud.database();
    const res = await db.collection('file_assets').add({
      data: {
        fileID: uploadRes.fileID,
        biz_type: bizType,
        child_id: childId || null,
        created_at: db.serverDate(),
      },
    });

    return {
      _id: res._id,
      fileID: uploadRes.fileID,
    };
  },
};
