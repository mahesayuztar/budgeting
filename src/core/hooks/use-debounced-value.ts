"use client";

import { useEffect, useState } from "react";

/**
 * Menahan nilai sampai pengetikan berhenti. Tanpa ini setiap ketukan tombol
 * jadi satu request pencarian ke server.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
