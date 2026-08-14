import { api } from "@/src/core/lib/api-client";
import type { Page } from "@/src/core/lib/pagination";
import type { DebtDTO } from "./services/debt.service";
import type {
  DebtInput,
  DebtListParams,
  DebtPaymentInput,
} from "./validators/debt.validator";

export const debtApi = {
  list: (params: DebtListParams = {}) =>
    api.get<Page<DebtDTO>>("/api/debts", { params }),

  create: (input: DebtInput) => api.post<DebtDTO>("/api/debts", input),

  addPayment: (uuid: string, input: DebtPaymentInput) =>
    api.post<DebtDTO>(`/api/debts/${uuid}/payments`, input),

  remove: (uuid: string) => api.delete<{ deleted: boolean }>(`/api/debts/${uuid}`),
};
