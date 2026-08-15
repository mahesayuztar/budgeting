import { api } from '@/src/lib/ApiClient';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { TransactionDTO } from './TransactionService';
import type { TransactionInput, TransactionListParams } from './TransactionValidator';

export const transactionApi = {
  list: (params: TransactionListParams = {}) => api.get<Page<TransactionDTO>>('/api/transactions', { params }),
  create: (input: TransactionInput) => api.post<TransactionDTO>('/api/transactions', input),
  update: (uuid: string, input: TransactionInput) => api.patch<TransactionDTO>(`/api/transactions/${uuid}`, input),
  remove: (uuid: string) => api.delete<{ deleted: boolean }>(`/api/transactions/${uuid}`),
};
