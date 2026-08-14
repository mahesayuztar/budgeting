import type { ReactNode } from "react";
import { requireAuthUser } from "@/src/core/auth/dal";
import AppHeader from "@/src/core/components/layout/app-header";
import BottomNav from "@/src/core/components/layout/bottom-nav";
import QueryProvider from "@/src/core/lib/query-provider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Pertahanan sebenarnya ada di sini; proxy hanya cek optimistik.
  const user = await requireAuthUser();

  return (
    <QueryProvider>
      {/* Layout kartu-berat butuh kanvas bertint supaya kartu putih terbaca
          "mengambang" (pola Stripe/Mercury). Tint-nya surface yang hampir
          netral — krem penuh terlalu pekat untuk area seluas ini. */}
      <div className="min-h-screen bg-theme-surface">
        <BottomNav />
        <AppHeader userName={user.name} />

        {/* pl-56 = lebar sidebar; konten memakai sisa layar tanpa max-width. */}
        <main className="px-4 pb-28 pt-4 md:pb-10 md:pl-64 md:pr-8 md:pt-6">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}
