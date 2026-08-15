'use client';

import { useCallback, useState } from 'react';
import { ApiError, type FieldErrors } from '@/src/lib/ApiClient';

type ApiActionHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

/**
 * Menyatukan state pending, error, dan fieldErrors untuk setiap panggilan
 * `api.*` supaya ketiganya tidak disalin ulang di tiap form. Function `run`
 * yang dikembalikan tidak pernah melempar: ia mengembalikan hasil aksi, atau
 * `undefined` bila aksi gagal.
 * @param {ApiActionHandler<TArgs, TResult>} action - Aksi async yang memanggil api client.
 * @returns {{ run: (...args: TArgs) => Promise<TResult | undefined>; pending: boolean; error: string | null; fieldErrors: FieldErrors; reset: () => void }} Pemicu aksi beserta state dan pembersihnya.
 */
export function useApiAction<TArgs extends unknown[], TResult>(action: ApiActionHandler<TArgs, TResult>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setPending(true);
      setError(null);
      setFieldErrors({});

      try {
        return await action(...args);
      } catch (caught) {
        if (caught instanceof ApiError) {
          setError(caught.message);
          setFieldErrors(caught.fieldErrors ?? {});
        } else {
          setError('Tidak dapat terhubung ke server.');
        }
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, error, fieldErrors, reset };
}
