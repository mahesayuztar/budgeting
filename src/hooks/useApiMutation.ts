'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError, type FieldErrors } from '@/src/lib/ApiClient';

type ApiMutationHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

type ApiMutationOptions = {
  invalidateKeys?: QueryKey[];
};

/**
 * Sama seperti `useApiAction`, tetapi state pending-nya berasal dari
 * `useMutation` milik TanStack Query dan seluruh `invalidateKeys` di-invalidate
 * otomatis begitu mutasi sukses, sehingga daftar terkait langsung refetch tanpa
 * `router.refresh()`. Function `run` yang dikembalikan tidak pernah melempar:
 * ia mengembalikan hasil mutasi, atau `undefined` bila mutasi gagal.
 * @param {ApiMutationHandler<TArgs, TResult>} action - Aksi async yang memanggil api client.
 * @param {ApiMutationOptions} options - Opsi mutasi.
 * @param {QueryKey[]} options.invalidateKeys - Query key yang di-invalidate setelah mutasi sukses.
 * @returns {{ run: (...args: TArgs) => Promise<TResult | undefined>; pending: boolean; error: string | null; fieldErrors: FieldErrors; reset: () => void }} Pemicu mutasi beserta state dan pembersihnya.
 */
export function useApiMutation<TArgs extends unknown[], TResult>(action: ApiMutationHandler<TArgs, TResult>, options: ApiMutationOptions = {}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (args: TArgs) => action(...args),
    onSuccess: () => {
      for (const _queryKey of options.invalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey: _queryKey });
      }
    },
  });

  /**
   * Membersihkan pesan error form sekaligus state internal mutasi.
   * @returns {void}
   */
  function reset() {
    setError(null);
    setFieldErrors({});
    mutation.reset();
  }

  /**
   * Menjalankan mutasi lalu menyerap error menjadi state form.
   * @param {...TArgs} args - Argumen yang diteruskan ke aksi api client.
   * @returns {Promise<TResult | undefined>} Hasil mutasi, atau undefined bila mutasi gagal.
   */
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
        setError('Tidak dapat terhubung ke server.');
      }
      return undefined;
    }
  }

  return { run, pending: mutation.isPending, error, fieldErrors, reset };
}
