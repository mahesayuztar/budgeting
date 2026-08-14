"use client";

import { useCallback, useState } from "react";
import { ApiError, type FieldErrors } from "@/src/core/lib/api-client";

type AnyAction<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * Menyatukan state loading/error/fieldErrors untuk setiap panggilan `api.*`,
 * supaya tidak disalin ulang di tiap form.
 *
 * `run()` tidak melempar: ia mengembalikan hasil, atau `undefined` bila gagal.
 */
export function useApiAction<TArgs extends unknown[], TResult>(
  action: AnyAction<TArgs, TResult>,
) {
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
          setError("Tidak dapat terhubung ke server.");
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
