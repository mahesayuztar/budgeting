import { api } from '@/src/lib/ApiClient';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { DebtDTO } from './DebtService';
import type { DebtInput, DebtListParams, DebtPaymentInput, DebtPaymentUpdateInput } from './DebtValidator';

export const debtApi = {
  list: (params: DebtListParams = {}) => api.get<Page<DebtDTO>>('/api/debts', { params }),
  create: (input: DebtInput) => api.post<DebtDTO>('/api/debts', input),
  addPayment: (uuid: string, input: DebtPaymentInput) => api.post<DebtDTO>(`/api/debts/${uuid}/payments`, input),
  updatePayment: (debtUuid: string, paymentUuid: string, input: DebtPaymentUpdateInput) => api.patch<DebtDTO>(`/api/debts/${debtUuid}/payments/${paymentUuid}`, input),
  removePayment: (debtUuid: string, paymentUuid: string) => api.delete<DebtDTO>(`/api/debts/${debtUuid}/payments/${paymentUuid}`),
  remove: (uuid: string) => api.delete<{ deleted: boolean }>(`/api/debts/${uuid}`),
};
