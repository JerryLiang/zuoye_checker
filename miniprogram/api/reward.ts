import { http } from './http';

export const rewardApi = {
  overview(child_id: number) {
    return http.get('/rewards/overview', { child_id });
  },
};
