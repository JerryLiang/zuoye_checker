import { http } from './http';

export interface LoginPayload {
  openid: string;
  nickname?: string;
  avatar_url?: string;
}

export const authApi = {
  wechatLogin(payload: LoginPayload) {
    return http.post<{ token: string; user: { id: number } }>('/auth/wechat-login', payload);
  },
};
