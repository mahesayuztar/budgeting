import { api } from "@/src/core/lib/api-client";
import type { CategoryDTO } from "./services/category.service";
import type { CategoryInput } from "./validators/category.validator";

export const categoryApi = {
  list: (type?: "INCOME" | "EXPENSE") =>
    api.get<CategoryDTO[]>("/api/categories", { params: { type } }),

  create: (input: CategoryInput) =>
    api.post<CategoryDTO>("/api/categories", input),

  update: (uuid: string, input: CategoryInput) =>
    api.patch<CategoryDTO>(`/api/categories/${uuid}`, input),

  remove: (uuid: string) =>
    api.delete<{ deleted: boolean }>(`/api/categories/${uuid}`),
};
