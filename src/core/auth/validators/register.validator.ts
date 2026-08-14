import { z } from "zod";
import {
  emailField,
  nameField,
  passwordField,
  usernameField,
} from "./user-fields";

export const registerSchema = z
  .object({
    name: nameField,
    username: usernameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
