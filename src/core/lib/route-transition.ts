/**
 * Jembatan kecil di luar React untuk memberi tahu overlay loading (lihat
 * route-loading-overlay.tsx) bahwa navigasi baru saja diminta lewat
 * `router.push`/`router.replace` secara manual — dibutuhkan karena efek
 * router itu sendiri tidak boleh dimutasi (aturan react-hooks/immutability),
 * dan klik `<Link>` sudah tertangkap lewat listener klik di overlay.
 */

type Listener = () => void;

let currentListener: Listener | null = null;

export function registerRouteTransitionListener(listener: Listener) {
  currentListener = listener;
  return () => {
    if (currentListener === listener) currentListener = null;
  };
}

export function markRouteTransitionStart() {
  currentListener?.();
}
