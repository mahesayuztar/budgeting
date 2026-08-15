import { z } from 'zod';
import { nameField, passwordField, usernameField } from '@/src/lib/auth/UserFields';

export const profileSchema = z.object({
  name: nameField,
  username: usernameField,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi.'),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine(_input => _input.newPassword === _input.confirmPassword, {
    message: 'Konfirmasi password tidak sama.',
    path: ['confirmPassword'],
  })
  .refine(_input => _input.newPassword !== _input.currentPassword, {
    message: 'Password baru harus berbeda dari password saat ini.',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
