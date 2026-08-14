import { z } from "zod";
import {
  nameField,
  passwordField,
  usernameField,
} from "@/src/core/auth/validators/user-fields";

export const profileSchema = z.object({
  name: nameField,
  username: usernameField,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Password baru harus berbeda dari password saat ini.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
