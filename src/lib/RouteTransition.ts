type RouteTransitionListener = () => void;

let currentListener: RouteTransitionListener | null = null;

/**
 * Mendaftarkan satu listener yang dipanggil saat navigasi manual dimulai.
 * Jembatan di luar React ini dibutuhkan karena efek milik router tidak boleh
 * dimutasi, sementara klik `<Link>` sudah tertangkap oleh listener klik pada
 * komponen RouteLoadingOverlay.
 * @param {RouteTransitionListener} listener - Callback yang dijalankan saat navigasi dimulai.
 * @returns {() => void} Function untuk melepas listener yang baru didaftarkan.
 */
export function registerRouteTransitionListener(listener: RouteTransitionListener) {
  currentListener = listener;

  return () => {
    if (currentListener === listener) currentListener = null;
  };
}

/**
 * Menandai bahwa navigasi lewat `router.push` atau `router.replace` baru saja
 * diminta, sehingga overlay loading dapat langsung ditampilkan.
 * @returns {void}
 */
export function markRouteTransitionStart() {
  currentListener?.();
}
