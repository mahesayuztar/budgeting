import { api } from '@/src/lib/ApiClient';
import type { SessionUser } from './AuthSession';
import type { RegisterInput } from './RegisterValidator';
import type { LoginInput } from './LoginValidator';

export const authApi = {
  register: (input: RegisterInput) => api.post<SessionUser>('/api/auth/register', input),
  login: (input: LoginInput) => api.post<SessionUser>('/api/auth/login', input),
  logout: () => api.post<{ loggedOut: boolean }>('/api/auth/logout'),
};
