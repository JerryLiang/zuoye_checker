export interface ChildItem {
  _id: string;
  user_id: string;
  name: string;
  gender?: 1 | 2;
  birth_date?: string;
  age_group: '3-6' | '7-9' | '10-12';
  grade?: string;
}

async function callChildren(action: string, data: any = {}) {
  const res = await wx.cloud.callFunction({
    name: 'children',
    data: { action, ...data },
  });
  const result = res.result as { code: number; message: string; data: any };
  if (result.code !== 0) {
    throw new Error(result.message || '请求失败');
  }
  return result;
}

export const childApi = {
  list() {
    return callChildren('list');
  },
  get(id: string) {
    return callChildren('get', { id });
  },
  create(payload: { name: string; age_group: '3-6' | '7-9' | '10-12'; gender?: 1 | 2; birth_date?: string; grade?: string }) {
    return callChildren('create', { data: payload });
  },
  update(id: string, payload: Partial<Pick<ChildItem, 'name' | 'age_group' | 'gender' | 'birth_date' | 'grade'>>) {
    return callChildren('update', { id, data: payload });
  },
  remove(id: string) {
    return callChildren('delete', { id });
  },
};
