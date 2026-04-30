import { http } from './http';

export interface ChildItem {
  id: number;
  user_id: number;
  name: string;
  gender?: 1 | 2;
  birth_date?: string;
  age_group: '3-6' | '7-9' | '10-12';
  grade?: string;
}

export const childApi = {
  list() {
    return http.get<ChildItem[]>('/children');
  },
  get(id: number) {
    return http.get<ChildItem>(`/children/${id}`);
  },
  create(payload: { name: string; age_group: '3-6' | '7-9' | '10-12'; gender?: 1 | 2; birth_date?: string; grade?: string }) {
    return http.post<ChildItem>('/children', payload);
  },
  update(id: number, payload: Partial<Pick<ChildItem, 'name' | 'age_group' | 'gender' | 'birth_date' | 'grade'>>) {
    return http.put<ChildItem>(`/children/${id}`, payload);
  },
  remove(id: number) {
    return http.del(`/children/${id}`);
  },
};
