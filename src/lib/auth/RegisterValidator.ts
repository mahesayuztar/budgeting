import { z } from 'zod';
import { emailField, nameField, passwordField, usernameField } from './UserFields';

export const registerSchema = z
  .object({
    name: nameField,
    username: usernameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(_input => _input.password === _input.confirmPassword, {
    message: 'Konfirmasi password tidak sama.',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
