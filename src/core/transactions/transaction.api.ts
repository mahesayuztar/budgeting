import { api } from "@/src/core/lib/api-client";
import type { Page } from "@/src/core/lib/pagination";
import type { TransactionDTO } from "./services/transaction.service";
import type {
  TransactionInput,
  TransactionListParams,
} from "./validators/transaction.validator";

export const transactionApi = {
  list: (params: TransactionListParams = {}) =>
    api.get<Page<TransactionDTO>>("/api/transactions", { params }),

  create: (input: TransactionInput) =>
    api.post<TransactionDTO>("/api/transactions", input),

  update: (uuid: string, input: TransactionInput) =>
    api.patch<TransactionDTO>(`/api/transactions/${uuid}`, input),

  remove: (uuid: string) =>
    api.delete<{ deleted: boolean }>(`/api/transactions/${uuid}`),
};
