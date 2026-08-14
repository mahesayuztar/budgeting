import type { ReactNode } from "react";
import { requireAuthUser } from "@/src/core/auth/dal";
import AppHeader from "@/src/core/components/layout/app-header";
import BottomNav from "@/src/core/components/layout/bottom-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Pertahanan sebenarnya ada di sini; proxy hanya cek optimistik.
  const user = await requireAuthUser();

  return (
    <div className="min-h-screen bg-theme-background">
      <AppHeader userName={user.name} />
      <BottomNav />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pl-60 md:pb-10">
        {children}
      </main>
    </div>
  );
}
