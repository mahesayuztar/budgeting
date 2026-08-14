import { api } from "@/src/core/lib/api-client";
import type { SessionUser } from "./session";
import type { RegisterInput } from "./validators/register.validator";
import type { LoginInput } from "./validators/login.validator";

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<SessionUser>("/api/auth/register", input),

  login: (input: LoginInput) => api.post<SessionUser>("/api/auth/login", input),

  logout: () => api.post<{ loggedOut: boolean }>("/api/auth/logout"),
};
