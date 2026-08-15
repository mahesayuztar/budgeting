'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Field';
import { ErrorAlert, SuccessAlert } from '@/src/components/ui/Alert';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { profileApi } from '@/src/lib/profile/ProfileApi';

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/**
 * Form penggantian password. Isian dikosongkan kembali setelah berhasil supaya
 * password lama tidak tertinggal di form, dan pengguna diberi tahu bahwa sesi
 * di perangkat lain ikut dikeluarkan.
 * @returns {ReactNode} Form penggantian password.
 */
export default function PasswordForm() {
  const [form, setForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [saved, setSaved] = useState(false);

  const { run, pending, error, fieldErrors } = useApiMutation(profileApi.changePassword);

  function getFieldChangeHandler(key: keyof PasswordForm) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setSaved(false);
      setForm(_previous => ({ ..._previous, [key]: event.target.value }));
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);

    const result = await run(form);
    if (!result) return;

    setForm(EMPTY_PASSWORD_FORM);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4">
        <ErrorAlert message={error} />
        {saved && <SuccessAlert message="Password diperbarui. Sesi di perangkat lain telah dikeluarkan." />}

        <Input
          label="Password Saat Ini"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.currentPassword}
          onChange={getFieldChangeHandler('currentPassword')}
          errors={fieldErrors.currentPassword}
        />

        <Input
          label="Password Baru"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          hint="Minimal 8 karakter, memuat huruf dan angka."
          value={form.newPassword}
          onChange={getFieldChangeHandler('newPassword')}
          errors={fieldErrors.newPassword}
        />

        <Input
          label="Ulangi Password Baru"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={getFieldChangeHandler('confirmPassword')}
          errors={fieldErrors.confirmPassword}
        />
      </div>

      <div className="mt-auto border-t border-gray-100 pt-4">
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? 'Menyimpan...' : 'Ubah Password'}
        </Button>
      </div>
    </form>
  );
}
