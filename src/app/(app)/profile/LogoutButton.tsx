'use client';

import { useRouter } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { Button } from '@/src/components/ui/Button';
import { authApi } from '@/src/lib/auth/AuthApi';
import { useApiAction } from '@/src/hooks/useApiAction';
import { markRouteTransitionStart } from '@/src/lib/RouteTransition';

/**
 * Tombol keluar dari akun pada halaman profil. Cache Server Component
 * disegarkan setelah sesi berakhir supaya halaman tidak menyisakan data
 * pengguna yang sudah keluar.
 * @returns {ReactNode} Tombol keluar dari akun.
 */
export default function LogoutButton() {
  const router = useRouter();
  const { run, pending } = useApiAction(authApi.logout);

  async function handleLogout() {
    if (!(await run())) return;

    markRouteTransitionStart();
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button variant="danger" onClick={handleLogout} disabled={pending}>
      <DynamicIcon icon="ph:sign-out" fontSize="16px" />
      {pending ? 'Keluar...' : 'Keluar dari Akun'}
    </Button>
  );
}
