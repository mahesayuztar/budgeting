"use client";

import { useState } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { ApiError, type FieldErrors } from "@/src/core/lib/api-client";

type AnyAction<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * Sama seperti `useApiAction`, tapi state pending-nya berasal dari TanStack
 * Query `useMutation`, dan `invalidateKeys` di-invalidate otomatis begitu
 * mutasi sukses -- list terkait langsung refetch tanpa `router.refresh()`.
 *
 * `run()` tidak melempar: ia mengembalikan hasil, atau `undefined` bila gagal.
 */
export function useApiMutation<TArgs extends unknown[], TResult>(
  action: AnyAction<TArgs, TResult>,
  options: { invalidateKeys?: QueryKey[] } = {},
) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (args: TArgs) => action(...args),
    onSuccess: () => {
      for (const key of options.invalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  function reset() {
    setError(null);
    setFieldErrors({});
    mutation.reset();
  }

  async function run(...args: TArgs): Promise<TResult | undefined> {
    setError(null);
    setFieldErrors({});

    try {
      return await mutation.mutateAsync(args);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fieldErrors ?? {});
      } else {
        setError("Tidak dapat terhubung ke server.");
      }
      return undefined;
    }
  }

  return { run, pending: mutation.isPending, error, fieldErrors, reset };
}
