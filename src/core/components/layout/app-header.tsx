"use client";

import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { authApi } from "@/src/core/auth/auth.api";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { markRouteTransitionStart } from "@/src/core/lib/route-transition";

export default function AppHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const { run, pending } = useApiAction(authApi.logout);

  async function handleLogout() {
    const result = await run();
    if (!result) return;

    markRouteTransitionStart();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur md:pl-56">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:h-16 md:px-8">
        {/* Di desktop brand sudah ada di sidebar, jadi cukup sapaan. */}
        <div className="min-w-0">
          <p className="font-logo text-lg font-bold leading-none text-gray-800 md:hidden">
            Budgeting
          </p>
          <p className="truncate text-[11px] text-gray-400 md:text-sm">
            Halo,{" "}
            <span className="font-semibold text-gray-700">{userName}</span>
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
          {pending ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </header>
  );
}
