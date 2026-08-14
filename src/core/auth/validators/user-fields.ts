import { z } from "zod";

/**
 * Aturan field identitas dipakai di dua tempat: register dan ubah profil.
 * Ditaruh terpisah supaya keduanya tidak pernah berbeda aturan.
 */
export const nameField = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(80);

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username minimal 3 karakter.")
  .max(30)
  .regex(
    /^[a-z0-9._-]+$/,
    "Username hanya boleh huruf, angka, titik, garis bawah, dan strip.",
  );

export const emailField = z.email("Format email tidak valid.").trim().toLowerCase();

export const passwordField = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .regex(/[a-zA-Z]/, "Password harus memuat huruf.")
  .regex(/[0-9]/, "Password harus memuat angka.");
