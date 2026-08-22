import { api } from '@/src/lib/ApiClient';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { SplitBillDTO, SplitBillListDTO } from './SplitBillDto';
import type { SplitBillSuggestionsDTO } from './SplitBillService';
import type { SplitBillDuplicateInput, SplitBillInput, SplitBillListParams, SplitBillUpdateInput } from './SplitBillValidator';

export const splitBillApi = {
  suggestions: () => api.get<SplitBillSuggestionsDTO>('/api/split-bills/suggestions'),
  list: (params: SplitBillListParams = {}) => api.get<Page<SplitBillListDTO>>('/api/split-bills', { params }),
  get: (uuid: string) => api.get<SplitBillDTO>(`/api/split-bills/${uuid}`),
  create: (input: SplitBillInput) => api.post<SplitBillDTO>('/api/split-bills', input),
  update: (uuid: string, input: SplitBillUpdateInput) => api.patch<SplitBillDTO>(`/api/split-bills/${uuid}`, input),
  duplicate: (uuid: string, input: SplitBillDuplicateInput) => api.post<SplitBillDTO>(`/api/split-bills/${uuid}/duplicate`, input),
  remove: (uuid: string) => api.delete<{ deleted: boolean }>(`/api/split-bills/${uuid}`),
};
