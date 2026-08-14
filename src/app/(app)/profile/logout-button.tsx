"use client";

import { useRouter } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Button } from "@/src/core/components/ui/button";
import { authApi } from "@/src/core/auth/auth.api";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { markRouteTransitionStart } from "@/src/core/lib/route-transition";

export default function LogoutButton() {
  const router = useRouter();
  const { run, pending } = useApiAction(authApi.logout);

  async function handleLogout() {
    if (!(await run())) return;

    markRouteTransitionStart();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="danger" onClick={handleLogout} disabled={pending}>
      <DynamicIcon icon="ph:sign-out" fontSize="16px" />
      {pending ? "Keluar..." : "Keluar dari Akun"}
    </Button>
  );
}
