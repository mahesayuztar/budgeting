"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { authApi } from "@/src/core/auth/auth.api";

const CONTROL =
  "w-full px-4 py-3 rounded-xl border bg-white text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400";

function borderClass(hasError: boolean) {
  return hasError
    ? "border-red-300 focus:border-red-400"
    : "border-gray-200 focus:border-theme-accent";
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;

  return (
    <>
      {messages.map((message) => (
        <p key={message} className="text-xs font-medium text-red-600">
          {message}
        </p>
      ))}
    </>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({
    password: false,
    confirmPassword: false,
  });

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { run, pending, error, fieldErrors } = useApiAction(authApi.register);

  function update(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  function toggle(key: string) {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const user = await run(form);
    if (!user) return;

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen w-full bg-theme-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col items-center gap-4">
        <div className="text-center w-full mb-2">
          <div className="font-logo text-4xl font-bold tracking-tight text-gray-800">
            Budgeting
          </div>
        </div>
        <div className="w-full bg-theme-light rounded-3xl p-8 shadow-xl border border-theme-light-border shadow-[#FFBE91]/10">
          <div className="text-left mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Buat Akun Baru</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Daftar sekarang untuk mulai mengelola keuangan Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ErrorAlert message={error} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Nama Anda"
                  value={form.name}
                  onChange={update("name")}
                  className={`${CONTROL} ${borderClass(Boolean(fieldErrors.name?.length))}`}
                />
                <FieldError messages={fieldErrors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-sm font-semibold text-gray-700"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="namapengguna"
                  value={form.username}
                  onChange={update("username")}
                  className={`${CONTROL} ${borderClass(Boolean(fieldErrors.username?.length))}`}
                />
                <FieldError messages={fieldErrors.username} />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nama@email.com"
                  value={form.email}
                  onChange={update("email")}
                  className={`${CONTROL} ${borderClass(Boolean(fieldErrors.email?.length))}`}
                />
                <FieldError messages={fieldErrors.email} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword["password"] ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={update("password")}
                    className={`${CONTROL} pr-12 ${borderClass(Boolean(fieldErrors.password?.length))}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggle("password")}
                    aria-label={
                      showPassword["password"] ? "Sembunyikan password" : "Tampilkan password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md transition-colors"
                  >
                    <DynamicIcon
                      icon={showPassword["password"] ? "ph:eye" : "ph:eye-closed"}
                      fontSize="15px"
                    />
                  </button>
                </div>
                <FieldError messages={fieldErrors.password} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-semibold text-gray-700"
                >
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword["confirmPassword"] ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    className={`${CONTROL} pr-12 ${borderClass(Boolean(fieldErrors.confirmPassword?.length))}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggle("confirmPassword")}
                    aria-label={
                      showPassword["confirmPassword"]
                        ? "Sembunyikan konfirmasi password"
                        : "Tampilkan konfirmasi password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md transition-colors"
                  >
                    <DynamicIcon
                      icon={showPassword["confirmPassword"] ? "ph:eye" : "ph:eye-closed"}
                      fontSize="15px"
                    />
                  </button>
                </div>
                <FieldError messages={fieldErrors.confirmPassword} />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3.5 px-4 bg-theme-accent hover:bg-theme-accent-light text-gray-800 font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-theme-accent/30 mt-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {pending ? "Memproses..." : "Daftar"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-8">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-bold text-gray-800 hover:underline decoration-theme-accent underline-offset-4"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
