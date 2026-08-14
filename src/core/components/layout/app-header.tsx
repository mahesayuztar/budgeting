"use client";

import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { authApi } from "@/src/core/auth/auth.api";
import { useApiAction } from "@/src/core/hooks/use-api-action";

export default function AppHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const { run, pending } = useApiAction(authApi.logout);

  async function handleLogout() {
    const result = await run();
    if (!result) return;

    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:pl-60">
        <div className="min-w-0">
          <p className="font-logo text-lg font-bold leading-none text-gray-800">
            Budgeting
          </p>
          <p className="truncate text-[11px] text-gray-400">Halo, {userName}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          aria-label="Keluar"
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
        >
          <DynamicIcon icon="ph:sign-out" fontSize="16px" />
          {pending ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </header>
  );
}
