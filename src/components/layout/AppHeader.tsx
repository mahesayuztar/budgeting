'use client';

import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { authApi } from '@/src/lib/auth/AuthApi';
import { useApiAction } from '@/src/hooks/useApiAction';
import { markRouteTransitionStart } from '@/src/lib/RouteTransition';

type AppHeaderOwnProps = {
  userName: string;
};

/**
 * Kepala aplikasi berisi sapaan pengguna dan tombol keluar. Nama merek hanya
 * ditampilkan pada layar sempit karena di layar lebar merek sudah tampil di
 * sidebar.
 * @param {AppHeaderOwnProps} props - Props komponen.
 * @param {string} props.userName - Nama pengguna yang sedang masuk.
 * @returns {ReactNode} Kepala aplikasi yang menempel di bagian atas halaman.
 */
export default function AppHeader({ userName }: AppHeaderOwnProps) {
  const router = useRouter();
  const { run, pending } = useApiAction(authApi.logout);

  async function handleLogout() {
    const result = await run();
    if (!result) return;

    markRouteTransitionStart();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur md:pl-56">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:h-16 md:px-8">
        <div className="min-w-0">
          <p className="font-logo text-lg font-bold leading-none text-gray-800 md:hidden">Budgeting</p>
          <p className="truncate text-[11px] text-gray-400 md:text-sm">
            Halo, <span className="font-semibold text-gray-700">{userName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          aria-label="Keluar"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 md:text-sm"
        >
          <DynamicIcon icon="ph:sign-out" fontSize="16px" />
          {pending ? 'Keluar...' : 'Keluar'}
        </button>
      </div>
    </header>
  );
}
