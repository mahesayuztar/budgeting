import type { AccountType } from "@prisma/client";
import { api } from "@/src/core/lib/api-client";
import type { AccountDTO } from "./services/account.service";
import type { AccountInput } from "./validators/account.validator";

export const accountApi = {
  list: (type?: AccountType) =>
    api.get<AccountDTO[]>("/api/accounts", {
      params: type ? { type } : undefined,
    }),

  create: (input: AccountInput) =>
    api.post<AccountDTO>("/api/accounts", input),

  update: (uuid: string, input: AccountInput) =>
    api.patch<AccountDTO>(`/api/accounts/${uuid}`, input),

  remove: (uuid: string) =>
    api.delete<{ deleted: boolean }>(`/api/accounts/${uuid}`),

  restore: (uuid: string) =>
    api.patch<AccountDTO>(`/api/accounts/${uuid}/restore`),
};