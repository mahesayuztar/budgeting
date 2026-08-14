"use client";

import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { run, pending, error, fieldErrors } = useApiAction(authApi.login);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const user = await run({ email, password });
    if (!user) return;

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen w-full bg-theme-background flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <div className="text-center w-full mb-2">
          <div className="font-logo font-['Clash Display'] text-4xl font-bold tracking-tight text-gray-800">
            Budgeting
          </div>
        </div>
        <div className="w-full max-w-md bg-theme-light rounded-3xl p-8 shadow-xl border-1 border-theme-light-border shadow-[#FFBE91]/10">
          <div className="text-left mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Selamat Datang</h1>
            <p className="text-sm text-gray-500 mt-1">
              Masukan akun Anda untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ErrorAlert message={error} />

            <div className="flex flex-col gap-1.5">
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`${CONTROL} ${borderClass(Boolean(fieldErrors.email?.length))}`}
              />
              <FieldError messages={fieldErrors.email} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${CONTROL} pr-12 ${borderClass(Boolean(fieldErrors.password?.length))}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md transition-colors"
                >
                  <DynamicIcon
                    icon={showPassword ? "ph:eye" : "ph:eye-closed"}
                    fontSize="15px"
                  />
                </button>
              </div>
              <FieldError messages={fieldErrors.password} />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3.5 px-4 bg-theme-accent hover:bg-theme-accent-light text-gray-800 font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-theme-accent/30 mt-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {pending ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-8">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-bold text-gray-800 hover:underline decoration-theme-accent underline-offset-4"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
