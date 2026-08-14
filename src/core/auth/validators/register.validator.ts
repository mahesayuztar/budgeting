import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username minimal 3 karakter.")
      .max(30)
      .regex(
        /^[a-z0-9._-]+$/,
        "Username hanya boleh huruf, angka, titik, garis bawah, dan strip.",
      ),
    email: z.email("Format email tidak valid.").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter.")
      .regex(/[a-zA-Z]/, "Password harus memuat huruf.")
      .regex(/[0-9]/, "Password harus memuat angka."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
