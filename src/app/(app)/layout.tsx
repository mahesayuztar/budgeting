import type { ReactNode } from 'react';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import AppHeader from '@/src/components/layout/AppHeader';
import BottomNav from '@/src/components/layout/BottomNav';
import QueryProvider from '@/src/context/QueryProvider';

type AppLayoutOwnProps = {
  children: ReactNode;
};

/**
 * Kerangka halaman untuk seluruh rute yang menuntut pengguna sudah masuk.
 * Pemeriksaan sesi di sini adalah pertahanan yang sebenarnya, sedangkan proxy
 * hanya melakukan pemeriksaan optimistik. Kanvas halaman diberi warna bertint
 * agar kartu putih di atasnya terbaca mengambang, dengan tint hampir netral
 * karena krem penuh terlalu pekat untuk area seluas ini. Padding kiri konten
 * pada layar lebar menyisakan ruang selebar sidebar.
 * @param {AppLayoutOwnProps} props - Props komponen.
 * @param {ReactNode} props.children - Isi halaman yang sedang dibuka.
 * @returns {ReactNode} Kerangka halaman beserta navigasi dan kepala aplikasinya.
 */
export default async function AppLayout({ children }: AppLayoutOwnProps) {
  const user = await requireAuthUser();

  return (
    <QueryProvider>
      <div className="min-h-screen bg-theme-surface">
        <BottomNav />
        <AppHeader userName={user.name} />

        <main className="px-4 pb-28 pt-4 md:pb-10 md:pl-64 md:pr-8 md:pt-6">{children}</main>
      </div>
    </QueryProvider>
  );
}
