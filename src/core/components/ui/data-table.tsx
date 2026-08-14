"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  flexRender,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { EmptyState } from "@/src/core/components/ui/empty-state";
import { useDebouncedValue } from "@/src/core/hooks/use-debounced-value";
import type { Page } from "@/src/core/lib/pagination";

/**
 * Fitur tabel dideklarasikan sekali di sini. TanStack Table v9 tidak lagi
 * memuat semua fitur secara default — hanya yang dirangkai yang ikut ke bundle.
 * Penyortiran/penyaringan dilakukan di server, jadi cukup fitur inti.
 */
export const appTableFeatures = tableFeatures({
  columnMeta: {} as { className?: string; headerClassName?: string },
});

export type AppTableFeatures = typeof appTableFeatures;

/** Kolomnya merender lewat `cell` dan tidak memakai `getValue()`, jadi
 *  TValue cukup `unknown` — tak perlu melonggarkan ke `any`. */
export type AppColumnDef<TData extends RowData> = ColumnDef<
  AppTableFeatures,
  TData,
  unknown
>;

type DataTableProps<TData extends RowData> = {
  queryKey: readonly unknown[];
  fetchPage: (params: { cursor?: string; q?: string }) => Promise<Page<TData>>;
  columns: AppColumnDef<TData>[];
  getRowId: (row: TData) => string;
  /** Halaman pertama hasil render server: menghemat satu round-trip saat muat awal. */
  initialPage?: Page<TData>;
  searchPlaceholder?: string;
  emptyIcon?: string;
  emptyTitle: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
};

export function DataTable<TData extends RowData>({
  queryKey,
  fetchPage,
  columns,
  getRowId,
  initialPage,
  searchPlaceholder = "Cari...",
  emptyIcon = "ph:magnifying-glass",
  emptyTitle,
  emptyDescription,
  toolbar,
}: DataTableProps<TData>) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const isSearching = debouncedSearch.trim().length > 0;

  const query = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearch],
    queryFn: ({ pageParam }) =>
      fetchPage({ cursor: pageParam, q: debouncedSearch || undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    initialData: isSearching
      ? undefined
      : initialPage
        ? { pages: [initialPage], pageParams: [undefined] }
        : undefined,
  });

  const rows = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const table = useTable({
    features: appTableFeatures,
    columns,
    data: rows,
    getRowId,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage) return;

    // rootMargin memuat halaman berikutnya sebelum sentinel benar-benar
    // terlihat, sehingga gulirannya tidak tersendat di batas halaman.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isInitialLoading = query.isPending;
  const isEmpty = !isInitialLoading && rows.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <DynamicIcon icon="ph:magnifying-glass" fontSize="16px" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-theme-accent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <DynamicIcon icon="ph:x" fontSize="14px" />
            </button>
          )}
        </div>

        {toolbar}
      </div>

      {query.isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          Gagal memuat data.{" "}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-bold underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      )}

      {isInitialLoading && <TableSkeleton />}

      {isEmpty && (
        <EmptyState
          icon={isSearching ? "ph:magnifying-glass" : emptyIcon}
          title={isSearching ? "Tidak ada hasil" : emptyTitle}
          description={
            isSearching
              ? `Tidak ada data yang cocok dengan "${debouncedSearch}".`
              : emptyDescription
          }
        />
      )}

      {rows.length > 0 && (
        <div
          className={`-mx-4 overflow-x-auto px-4 transition-opacity ${
            query.isPlaceholderData ? "opacity-60" : "opacity-100"
          }`}
        >
          <table className="w-full min-w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  // Krem pekat pas di sini: area tipis, dan justru menandai
                  // baris header sebagai "chrome" tabel, bukan data.
                  className="border-b border-theme-light-border/40 bg-theme-light text-left text-[11px] uppercase tracking-wide text-gray-500"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      // px-3 memberi jarak antar kolom; kolom utama memakai
                      // `w-full max-w-0` sehingga sisanya mudah terhimpit.
                      className={`whitespace-nowrap px-3 py-2.5 font-semibold first:rounded-l-lg last:rounded-r-lg ${
                        header.column.columnDef.meta?.headerClassName ?? ""
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group align-middle transition-colors hover:bg-theme-light/70"
                >
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      // Pemisah baris di td (bukan divide-y di tbody) supaya
                      // tidak bentrok dengan sudut membulat saat hover.
                      className={`border-b border-gray-50 px-3 py-2.5 first:rounded-l-lg last:rounded-r-lg ${
                        cell.column.columnDef.meta?.className ?? ""
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sentinel infinite scroll */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {isFetchingNextPage && (
        <p className="py-2 text-center text-xs font-semibold text-gray-400">
          Memuat lebih banyak...
        </p>
      )}

      {!hasNextPage && rows.length > 0 && (
        <p className="py-2 text-center text-[11px] text-gray-300">
          Semua data sudah ditampilkan
        </p>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2 py-2">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-10 rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}
