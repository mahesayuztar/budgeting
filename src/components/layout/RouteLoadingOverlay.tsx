'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { registerRouteTransitionListener } from '@/src/lib/RouteTransition';

const SHOW_DELAY_MS = 150;
const TRICKLE_INTERVAL_MS = 200;
const HIDE_DELAY_MS = 250;

/**
 * Menentukan apakah sebuah klik benar-benar memulai navigasi internal, sehingga
 * overlay tidak ikut muncul pada klik yang membuka tab baru, mengunduh berkas,
 * menuju domain lain, atau menuju alamat yang sedang dibuka.
 * @param {MouseEvent} event - Event klik yang tertangkap di tingkat dokumen.
 * @returns {boolean} true bila klik tersebut memulai navigasi di dalam aplikasi.
 */
function isInternalNavigationClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const target = event.target as HTMLElement | null;
  const anchor = target?.closest('a');
  if (!anchor || !anchor.href) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;

  return true;
}

/**
 * Isi overlay pemuatan halaman. Navigasi dianggap dimulai dari tiga sumber:
 * klik `<Link>` lewat listener klik di tingkat dokumen, tombol maju atau mundur
 * peramban lewat `popstate`, dan `router.push` atau `router.replace` manual di
 * luar `<Link>` lewat `markRouteTransitionStart`. Navigasi dianggap selesai
 * ketika pathname atau search params berubah, yang baru terjadi setelah halaman
 * tujuan selesai dirender karena belum ada `loading.tsx` di rute mana pun.
 * Overlay sendiri baru muncul setelah jeda pendek supaya navigasi yang memang
 * cepat tidak berkedip.
 * @returns {ReactNode} Overlay pemuatan, atau null bila tidak ada navigasi berjalan.
 */
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

  function startProgress() {
    isNavigating.current = true;
    clearAllTimers();
    setProgress(8);

    showTimer.current = setTimeout(() => {
      if (!isNavigating.current) return;
      setVisible(true);

      trickleTimer.current = setInterval(() => {
        setProgress(_current => (_current >= 90 ? _current : _current + (90 - _current) * 0.12 + 1));
      }, TRICKLE_INTERVAL_MS);
    }, SHOW_DELAY_MS);
  }

  function finishProgress() {
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

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (isInternalNavigationClick(event)) startProgress();
    }

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('popstate', startProgress);
    const unregister = registerRouteTransitionListener(startProgress);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('popstate', startProgress);
      unregister();
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    finishProgress();
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-theme-secondary border-t-theme-primary" />
        {/* eslint-disable-next-line @next/next/no-img-element -- favicon.ico ikut berubah otomatis saat filenya diganti */}
        <img src="/favicon.ico" alt="" className="h-8 w-8 rounded-md" />
      </div>

      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-theme-light">
        <div className="h-full rounded-full bg-gradient-to-r from-theme-primary to-theme-accent transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <span className="sr-only">Memuat halaman...</span>
    </div>
  );
}

/**
 * Membungkus overlay pemuatan dalam Suspense karena `useSearchParams` di
 * dalamnya menuntut batas Suspense saat halaman dirender di server.
 * @returns {ReactNode} Overlay pemuatan halaman.
 */
export default function RouteLoadingOverlay() {
  return (
    <Suspense fallback={null}>
      <RouteLoadingOverlayContent />
    </Suspense>
  );
}
