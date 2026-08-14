"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { registerRouteTransitionListener } from "@/src/core/lib/route-transition";

// Delay sebelum overlay ditampilkan, supaya navigasi yang sudah cepat tidak berkedip.
const SHOW_DELAY_MS = 150;
const TRICKLE_INTERVAL_MS = 200;
const HIDE_DELAY_MS = 250;

function isInternalNavigationClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a");
  if (!anchor || !anchor.href) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return false;
  }

  return true;
}

function RouteLoadingOverlayContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigating = useRef(false);

  function clearAllTimers() {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (trickleTimer.current) clearInterval(trickleTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = null;
    trickleTimer.current = null;
    hideTimer.current = null;
  }

  function start() {
    isNavigating.current = true;
    clearAllTimers();
    setProgress(8);
    showTimer.current = setTimeout(() => {
      if (!isNavigating.current) return;
      setVisible(true);
      trickleTimer.current = setInterval(() => {
        setProgress((current) =>
          current >= 90 ? current : current + (90 - current) * 0.12 + 1,
        );
      }, TRICKLE_INTERVAL_MS);
    }, SHOW_DELAY_MS);
  }

  function finish() {
    if (!isNavigating.current) return;
    isNavigating.current = false;
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (trickleTimer.current) {
      clearInterval(trickleTimer.current);
      trickleTimer.current = null;
    }
    setProgress(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, HIDE_DELAY_MS);
  }

  // Tiga sumber sinyal "navigasi dimulai": klik <Link> (listener klik di
  // bawah), tombol back/forward browser (popstate), dan router.push/replace
  // manual di luar <Link> lewat markRouteTransitionStart (lihat
  // src/core/lib/route-transition.ts — dipakai karena `router` dari
  // useRouter() sendiri tidak boleh dimutasi). Sinyal "navigasi selesai"
  // adalah perubahan pathname/searchParams (efek di bawah): itu baru terjadi
  // setelah halaman tujuan selesai dirender, karena belum ada loading.tsx di
  // rute manapun.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isInternalNavigationClick(event)) start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    const unregister = registerRouteTransitionListener(start);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
      unregister();
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
        {/* eslint-disable-next-line @next/next/no-img-element -- favicon.ico ikut berubah otomatis saat filenya diganti */}
        <img src="/favicon.ico" alt="" className="h-8 w-8 rounded-md" />
      </div>

      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gray-800 transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="sr-only">Memuat halaman...</span>
    </div>
  );
}

export default function RouteLoadingOverlay() {
  return (
    <Suspense fallback={null}>
      <RouteLoadingOverlayContent />
    </Suspense>
  );
}
