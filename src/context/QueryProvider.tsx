'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type QueryProviderOwnProps = {
  children: ReactNode;
};

/**
 * Menyediakan QueryClient TanStack Query untuk seluruh pohon komponen klien.
 * Client dibuat di dalam state, bukan sebagai modul global, supaya setiap klien
 * memegang instance sendiri dan cache tidak terbagi antar request saat render
 * di server. Refetch saat tab difokuskan dimatikan karena data sudah di-refetch
 * lewat invalidate setelah setiap mutasi.
 * @param {QueryProviderOwnProps} props - Props komponen.
 * @param {ReactNode} props.children - Pohon komponen yang memakai TanStack Query.
 * @returns {ReactNode} Provider TanStack Query beserta isinya.
 */
export default function QueryProvider({ children }: QueryProviderOwnProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
