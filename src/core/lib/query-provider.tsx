"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Dibuat di dalam state: satu QueryClient per klien, bukan satu modul
  // global yang akan dibagi antar request saat render di server.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data sudah di-refetch lewat invalidate setelah mutasi, jadi
            // tidak perlu ribut menembak ulang tiap kali tab difokuskan.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
