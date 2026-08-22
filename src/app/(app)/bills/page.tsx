'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markRouteTransitionStart } from '@/src/lib/RouteTransition';

/** Mengarahkan root hub Tagihan melalui mekanisme overlay navigasi aplikasi. */
export default function BillsPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      markRouteTransitionStart();
      router.replace('/bills/split');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
