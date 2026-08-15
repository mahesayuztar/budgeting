'use client';

import { useEffect, useState } from 'react';

/**
 * Menahan perubahan nilai sampai pengetikan berhenti selama jeda tertentu.
 * Tanpa penundaan ini setiap ketukan tombol menjadi satu request pencarian ke
 * server.
 * @param {T} value - Nilai yang berubah cepat, biasanya isi input pencarian.
 * @param {number} delay - Lama jeda diam dalam milidetik sebelum nilai diteruskan, default 300.
 * @returns {T} Nilai terakhir setelah pengetikan berhenti selama `delay`.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
