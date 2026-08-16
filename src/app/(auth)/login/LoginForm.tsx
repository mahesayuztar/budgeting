'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { ErrorAlert } from '@/src/components/ui/Alert';
import { CONTROL_CLASS, FieldError, getBorderClass } from '@/src/components/ui/Field';
import { useApiAction } from '@/src/hooks/useApiAction';
import { authApi } from '@/src/lib/auth/AuthApi';
import { markRouteTransitionStart } from '@/src/lib/RouteTransition';

/**
 * Form digunakan untuk pass jsx keseluruhan setelah proxy khusus 
 * memfilter guest sudah berhasil
 * @returns {ReactNode} Halaman masuk beserta formnya.
 */
export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { run, pending, error, fieldErrors } = useApiAction(authApi.login);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const user = await run({ email, password });
    if (!user) return;

    markRouteTransitionStart();
    router.replace('/dashboard');
    router.refresh();
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-theme-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="mb-2 w-full text-center">
          <div className="font-logo text-4xl font-bold tracking-tight text-gray-800">Budgeting</div>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-theme-light-border bg-theme-light p-8 shadow-xl shadow-[#FFBE91]/10">
          <div className="mb-8 text-left">
            <h1 className="text-2xl font-bold text-gray-800">Selamat Datang</h1>
            <p className="mt-1 text-sm text-gray-500">Masukan akun Anda untuk melanjutkan</p>
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
                onChange={handleEmailChange}
                className={`${CONTROL_CLASS} ${getBorderClass(Boolean(fieldErrors.email?.length))}`}
              />
              <FieldError fieldName="email" messages={fieldErrors.email} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`${CONTROL_CLASS} pr-12 ${getBorderClass(Boolean(fieldErrors.password?.length))}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(_previous => !_previous)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-800"
                >
                  <DynamicIcon icon={showPassword ? 'ph:eye' : 'ph:eye-closed'} fontSize="15px" />
                </button>
              </div>
              <FieldError fieldName="password" messages={fieldErrors.password} />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full cursor-pointer rounded-xl bg-theme-primary px-4 py-3.5 font-bold text-gray-800 shadow-md shadow-theme-primary/30 transition-all duration-200 hover:bg-theme-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {pending ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500">
            Belum punya akun?{' '}
            <Link href="/register" className="font-bold text-gray-800 decoration-theme-accent underline-offset-4 hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
