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

type RegisterForm = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_REGISTER_FORM: RegisterForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/**
 * Halaman pendaftaran akun baru. Setelah pendaftaran diterima, cache Server
 * Component disegarkan lebih dulu supaya dashboard langsung menampilkan data
 * pengguna yang baru dibuat.
 * @returns {ReactNode} Halaman pendaftaran beserta formnya.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({
    password: false,
    confirmPassword: false,
  });

  const [form, setForm] = useState<RegisterForm>(EMPTY_REGISTER_FORM);

  const { run, pending, error, fieldErrors } = useApiAction(authApi.register);

  function getFieldChangeHandler(key: keyof RegisterForm) {
    return (event: ChangeEvent<HTMLInputElement>) => setForm(_previous => ({ ..._previous, [key]: event.target.value }));
  }

  function togglePasswordVisibility(key: string) {
    setVisiblePasswords(_previous => ({ ..._previous, [key]: !_previous[key] }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const user = await run(form);
    if (!user) return;

    markRouteTransitionStart();
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-theme-background p-4">
      <div className="flex w-full max-w-2xl flex-col items-center gap-4">
        <div className="mb-2 w-full text-center">
          <div className="font-logo text-4xl font-bold tracking-tight text-gray-800">Budgeting</div>
        </div>

        <div className="w-full rounded-3xl border border-theme-light-border bg-theme-light p-8 shadow-xl shadow-[#FFBE91]/10">
          <div className="mb-6 text-left">
            <h1 className="text-2xl font-bold text-gray-800">Buat Akun Baru</h1>
            <p className="mt-0.5 text-sm text-gray-500">Daftar sekarang untuk mulai mengelola keuangan Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ErrorAlert message={error} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  onChange={getFieldChangeHandler('name')}
                  className={`${CONTROL_CLASS} ${getBorderClass(Boolean(fieldErrors.name?.length))}`}
                />
                <FieldError fieldName="name" messages={fieldErrors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-sm font-semibold text-gray-700">
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
                  onChange={getFieldChangeHandler('username')}
                  className={`${CONTROL_CLASS} ${getBorderClass(Boolean(fieldErrors.username?.length))}`}
                />
                <FieldError fieldName="username" messages={fieldErrors.username} />
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
                  onChange={getFieldChangeHandler('email')}
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
                    type={visiblePasswords.password ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={getFieldChangeHandler('password')}
                    className={`${CONTROL_CLASS} pr-12 ${getBorderClass(Boolean(fieldErrors.password?.length))}`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('password')}
                    aria-label={visiblePasswords.password ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-800"
                  >
                    <DynamicIcon icon={visiblePasswords.password ? 'ph:eye' : 'ph:eye-closed'} fontSize="15px" />
                  </button>
                </div>
                <FieldError fieldName="password" messages={fieldErrors.password} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={getFieldChangeHandler('confirmPassword')}
                    className={`${CONTROL_CLASS} pr-12 ${getBorderClass(Boolean(fieldErrors.confirmPassword?.length))}`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    aria-label={visiblePasswords.confirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-800"
                  >
                    <DynamicIcon icon={visiblePasswords.confirmPassword ? 'ph:eye' : 'ph:eye-closed'} fontSize="15px" />
                  </button>
                </div>
                <FieldError fieldName="confirmPassword" messages={fieldErrors.confirmPassword} />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full cursor-pointer rounded-xl bg-theme-primary px-4 py-3.5 font-bold text-gray-800 shadow-md shadow-theme-primary/30 transition-all duration-200 hover:bg-theme-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {pending ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-bold text-gray-800 decoration-theme-accent underline-offset-4 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
