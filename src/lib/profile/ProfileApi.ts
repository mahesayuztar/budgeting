import { api } from '@/src/lib/ApiClient';
import type { SessionUser } from '@/src/lib/auth/AuthSession';
import type { ChangePasswordInput, ProfileInput } from './ProfileValidator';

export const profileApi = {
  update: (input: ProfileInput) => api.patch<SessionUser>('/api/profile', input),
  changePassword: (input: ChangePasswordInput) => api.patch<{ changed: boolean }>('/api/profile/password', input),
};
