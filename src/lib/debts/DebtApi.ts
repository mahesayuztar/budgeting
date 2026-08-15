import { api } from '@/src/lib/ApiClient';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { DebtDTO } from './DebtService';
import type { DebtInput, DebtListParams, DebtPaymentInput } from './DebtValidator';

export const debtApi = {
  list: (params: DebtListParams = {}) => api.get<Page<DebtDTO>>('/api/debts', { params }),
  create: (input: DebtInput) => api.post<DebtDTO>('/api/debts', input),
  addPayment: (uuid: string, input: DebtPaymentInput) => api.post<DebtDTO>(`/api/debts/${uuid}/payments`, input),
  remove: (uuid: string) => api.delete<{ deleted: boolean }>(`/api/debts/${uuid}`),
};
