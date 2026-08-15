import type { AccountType } from '@prisma/client';
import { api } from '@/src/lib/ApiClient';
import type { AccountDTO } from './AccountService';
import type { AccountInput } from './AccountValidator';

export const accountApi = {
  list: (type?: AccountType) => api.get<AccountDTO[]>('/api/accounts', { params: type ? { type } : undefined }),
  create: (input: AccountInput) => api.post<AccountDTO>('/api/accounts', input),
  update: (uuid: string, input: AccountInput) => api.patch<AccountDTO>(`/api/accounts/${uuid}`, input),
  remove: (uuid: string) => api.delete<{ deleted: boolean }>(`/api/accounts/${uuid}`),
  restore: (uuid: string) => api.patch<AccountDTO>(`/api/accounts/${uuid}/restore`),
};
