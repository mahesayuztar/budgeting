'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Field';
import { ErrorAlert, SuccessAlert } from '@/src/components/ui/Alert';
import { useApiMutation } from '@/src/hooks/useApiMutation';
import { profileApi } from '@/src/lib/profile/ProfileApi';

type ProfileFormOwnProps = {
  name: string;
  username: string;
};

/**
 * Form penyuntingan nama dan username pengguna. Tombol simpan tetap terkunci
 * selama isian belum berubah, dan halaman disegarkan setelah tersimpan karena
 * nama pengguna juga tampil di kepala aplikasi yang dirender di server.
 * @param {ProfileFormOwnProps} props - Props komponen.
 * @param {string} props.name - Nama pengguna saat ini.
 * @param {string} props.username - Username pengguna saat ini.
 * @returns {ReactNode} Form informasi akun.
 */
export default function ProfileForm({ name: initialName, username: initialUsername }: ProfileFormOwnProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [saved, setSaved] = useState(false);

  const { run, pending, error, fieldErrors } = useApiMutation(profileApi.update);

  const isDirty = name !== initialName || username !== initialUsername;

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
    setSaved(false);
  }

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value);
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);

    const updated = await run({ name, username });
    if (!updated) return;

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4">
        <ErrorAlert message={error} />
        {saved && <SuccessAlert message="Profil berhasil diperbarui." />}

        <Input label="Nama Lengkap" required maxLength={80} autoComplete="name" placeholder="Nama Anda" value={name} onChange={handleNameChange} errors={fieldErrors.name} />

        <Input
          label="Username"
          required
          maxLength={30}
          autoComplete="username"
          placeholder="namapengguna"
          hint="Huruf kecil, angka, titik, garis bawah, dan strip."
          value={username}
          onChange={handleUsernameChange}
          errors={fieldErrors.username}
        />
      </div>

      <div className="mt-auto border-gray-100 pt-4">
        <Button type="submit" fullWidth disabled={pending || !isDirty}>
          {pending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
