import { api } from "@/src/core/lib/api-client";
import type { SessionUser } from "@/src/core/auth/session";
import type {
  ChangePasswordInput,
  ProfileInput,
} from "./validators/profile.validator";

export const profileApi = {
  update: (input: ProfileInput) => api.patch<SessionUser>("/api/profile", input),

  changePassword: (input: ChangePasswordInput) =>
    api.patch<{ changed: boolean }>("/api/profile/password", input),
};
