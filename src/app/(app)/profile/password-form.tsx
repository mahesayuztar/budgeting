"use client";

import { useState } from "react";
import { Button } from "@/src/core/components/ui/button";
import { Input } from "@/src/core/components/ui/field";
import { ErrorAlert, SuccessAlert } from "@/src/core/components/ui/alert";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { profileApi } from "@/src/core/profile/profile.api";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function PasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const { run, pending, error, fieldErrors } = useApiAction(
    profileApi.changePassword,
  );

  function update(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setSaved(false);
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);

    const result = await run(form);
    if (!result) return;

    setForm(EMPTY);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorAlert message={error} />
      {saved && (
        <SuccessAlert message="Password diperbarui. Sesi di perangkat lain telah dikeluarkan." />
      )}

      <Input
        label="Password Saat Ini"
        type={visible ? "text" : "password"}
        required
        autoComplete="current-password"
        placeholder="••••••••"
        value={form.currentPassword}
        onChange={update("currentPassword")}
        errors={fieldErrors.currentPassword}
      />

      <Input
        label="Password Baru"
        type={visible ? "text" : "password"}
        required
        autoComplete="new-password"
        placeholder="••••••••"
        hint="Minimal 8 karakter, memuat huruf dan angka."
        value={form.newPassword}
        onChange={update("newPassword")}
        errors={fieldErrors.newPassword}
      />

      <Input
        label="Ulangi Password Baru"
        type={visible ? "text" : "password"}
        required
        autoComplete="new-password"
        placeholder="••••••••"
        value={form.confirmPassword}
        onChange={update("confirmPassword")}
        errors={fieldErrors.confirmPassword}
      />

      <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-theme-primary"
        />
        Tampilkan password
      </label>

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Menyimpan..." : "Ubah Password"}
      </Button>
    </form>
  );
}
