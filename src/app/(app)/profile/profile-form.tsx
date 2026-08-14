"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/core/components/ui/button";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert, SuccessAlert } from "@/src/core/components/ui/alert";
import { useApiMutation } from "@/src/core/hooks/use-api-mutation";
import { profileApi } from "@/src/core/profile/profile.api";

export default function ProfileForm({
  name: initialName,
  username: initialUsername,
}: {
  name: string;
  username: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [saved, setSaved] = useState(false);

  const { run, pending, error, fieldErrors } = useApiMutation(profileApi.update);

  const dirty = name !== initialName || username !== initialUsername;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);

    const updated = await run({ name, username });
    if (!updated) return;

    setSaved(true);
    // Nama pengguna juga muncul di header layout, jadi server perlu render ulang.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4">
        <ErrorAlert message={error} />
        {saved && <SuccessAlert message="Profil berhasil diperbarui." />}

        <Input
          label="Nama Lengkap"
          required
          maxLength={80}
          autoComplete="name"
          placeholder="Nama Anda"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          errors={fieldErrors.name}
        />

        <Input
          label="Username"
          required
          maxLength={30}
          autoComplete="username"
          placeholder="namapengguna"
          hint="Huruf kecil, angka, titik, garis bawah, dan strip."
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setSaved(false);
          }}
          errors={fieldErrors.username}
        />
      </div>

      <div className="mt-auto border-gray-100 pt-4">
        <Button type="submit" fullWidth disabled={pending || !dirty}>
          {pending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
