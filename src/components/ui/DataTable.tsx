'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { flexRender, tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import DynamicIcon from '@/src/components/commons/DynamicIcon';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import type { Page } from '@/src/helpers/PaginationHelper';
import { EmptyState } from './EmptyState';
import { Select, type SelectOption } from './Field';
import { Sheet } from './Sheet';

/**
 * Fitur tabel dideklarasikan sekali di sini. TanStack Table v9 tidak lagi
 * memuat seluruh fitur secara bawaan, hanya yang dirangkai yang ikut ke bundle.
 * Penyortiran dan penyaringan dikerjakan di server, sehingga cukup fitur inti.
 */
export const appTableFeatures = tableFeatures({
  columnMeta: {} as { className?: string; headerClassName?: string },
});

export type AppTableFeatures = typeof appTableFeatures;

/**
 * Definisi kolom tabel aplikasi. Kolom merender lewat `cell` dan tidak memakai
 * `getValue()`, sehingga tipe nilainya cukup `unknown` dan tidak perlu
 * dilonggarkan menjadi `any`.
 */
export type AppColumnDef<TData extends RowData> = ColumnDef<AppTableFeatures, TData, unknown>;

export type DataTableFilterOption = SelectOption & {
  parentValue?: string;
};

export type DataTableFilter = {
  id: string;
  label: string;
  allLabel?: string;
  parentId?: string;
  options: readonly DataTableFilterOption[];
};

export type DataTableFilterValues = Record<string, string>;

type DataTableFetchParams = {
  cursor?: string;
  q?: string;
  filters: DataTableFilterValues;
};

type DataTableOwnProps<TData extends RowData> = {
  queryKey: readonly unknown[];
  fetchPage: (params: DataTableFetchParams) => Promise<Page<TData>>;
  columns: AppColumnDef<TData>[];
  getRowId: (row: TData) => string;
  initialPage?: Page<TData>;
  filters?: readonly DataTableFilter[];
  filterTitle?: string;
  searchPlaceholder?: string;
  emptyIcon?: string;
  emptyTitle: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  renderExpandedRow?: (row: TData) => ReactNode;
  expanderPosition?: 'start' | 'end';
  tableClassName?: string;
};

/**
 * Rangka baris abu-abu berdenyut yang menggantikan tabel selama data dimuat.
 * @returns {ReactNode} Lima baris rangka bertinggi tetap.
 */
export function TableSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Memuat data tabel" className="flex animate-pulse flex-col gap-2 py-2">
      {Array.from({ length: 5 }, (_unused, _index) => (
        <div key={`table_skeleton__row_${_index}`} className="h-10 rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

/**
 * Indikator ringkas saat cursor berikutnya sedang dimuat. Spinner dibuat dari
 * CSS sehingga tidak menunggu ikon jaringan dan tetap langsung terlihat.
 * @returns {ReactNode} Status pemuatan halaman berikutnya.
 */
export function TableNextPageLoader() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-400">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
      <span>Memuat data berikutnya...</span>
    </div>
  );
}

/**
 * Tabel data dengan pencarian, filter bertingkat, muat ulang, dan gulir tak hingga berbasis
 * cursor. Rangka baris hanya ditampilkan bila belum ada data sama sekali.
 * Refetch yang dipicu `invalidateQueries` setelah operasi CRUD mempertahankan
 * baris lama sambil meredupkannya, sehingga latensi server tidak mengosongkan
 * seluruh tabel. Pergantian pencarian juga memakai data placeholder yang sama.
 * @param {DataTableOwnProps<TData>} props - Props komponen.
 * @param {readonly unknown[]} props.queryKey - Query key TanStack Query untuk daftar ini.
 * @param {(params: DataTableFetchParams) => Promise<Page<TData>>} props.fetchPage - Pengambil satu halaman data beserta nilai filter aktif.
 * @param {AppColumnDef<TData>[]} props.columns - Definisi kolom tabel.
 * @param {(row: TData) => string} props.getRowId - Pengambil identifier stabil tiap baris.
 * @param {Page<TData>} props.initialPage - Halaman pertama hasil render server, menghemat satu round-trip saat muat awal.
 * @param {DataTableFilter[]} props.filters - Definisi filter select yang nilainya diteruskan ke `fetchPage`.
 * @param {string} props.filterTitle - Judul panel filter pada layar sempit, default `Filter data`.
 * @param {string} props.searchPlaceholder - Teks pada kolom pencarian, default `Cari...`.
 * @param {string} props.emptyIcon - Nama ikon Iconify saat daftar kosong.
 * @param {string} props.emptyTitle - Judul saat daftar kosong.
 * @param {string} props.emptyDescription - Penjelasan tambahan saat daftar kosong, opsional.
 * @param {ReactNode} props.toolbar - Aksi tambahan di samping tombol muat ulang, opsional.
 * @param {'start' | 'end'} props.expanderPosition - Posisi tombol pembuka detail baris, default `start` agar seragam di seluruh tabel.
 * @param {string} props.tableClassName - Kelas tambahan pada elemen table, misalnya lebar minimum untuk tabel horizontal.
 * @returns {ReactNode} Tabel data beserta pencarian dan keadaan muat, kosong, serta gagalnya.
 */
export function DataTable<TData extends RowData>({
  queryKey,
  fetchPage,
  columns,
  getRowId,
  initialPage,
  filters = [],
  filterTitle = 'Filter data',
  searchPlaceholder = 'Cari...',
  emptyIcon = 'ph:magnifying-glass',
  emptyTitle,
  emptyDescription,
  toolbar,
  renderExpandedRow,
  expanderPosition = 'start',
  tableClassName = '',
}: DataTableOwnProps<TData>) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<DataTableFilterValues>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());
  const debouncedSearch = useDebouncedValue(search, 300);
  const isSearching = debouncedSearch.trim().length > 0;
  const activeFilters = useMemo(
    () => Object.fromEntries(filters.map(_filter => [_filter.id, filterValues[_filter.id]] as const).filter((entry): entry is readonly [string, string] => Boolean(entry[1]))),
    [filters, filterValues],
  );
  const activeFilterCount = Object.keys(activeFilters).length;
  const isFiltering = activeFilterCount > 0;

  function setFilterValue(id: string, value: string) {
    setFilterValues(_current => {
      const next = { ..._current };
      if (value) next[id] = value;
      else delete next[id];

      for (const _filter of filters) {
        if (!_filter.parentId) continue;

        const selectedValue = next[_filter.id];
        const parentValue = next[_filter.parentId];
        if (!selectedValue || !parentValue) continue;

        const selectedOption = _filter.options.find(_option => _option.value === selectedValue);
        if (selectedOption?.parentValue && selectedOption.parentValue !== parentValue) delete next[_filter.id];
      }

      return next;
    });
  }

  const query = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearch, activeFilters],
    queryFn: ({ pageParam }) => fetchPage({ cursor: pageParam, q: debouncedSearch || undefined, filters: activeFilters }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: _lastPage => _lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    initialData: isSearching || isFiltering ? undefined : initialPage ? { pages: [initialPage], pageParams: [undefined] } : undefined,
  });

  const rows = useMemo(() => query.data?.pages.flatMap(_page => _page.items) ?? [], [query.data]);

  const table = useTable({
    features: appTableFeatures,
    columns,
    data: rows,
    getRowId,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRequestRef = useRef(false);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage) return;

    const observer = new IntersectionObserver(
      _entries => {
        if (!_entries[0]?.isIntersecting || isFetchingNextPage || nextPageRequestRef.current) return;

        nextPageRequestRef.current = true;
        void fetchNextPage({ cancelRefetch: false }).finally(() => {
          nextPageRequestRef.current = false;
        });
      },
      { rootMargin: '300px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isLoadingWithoutRows = query.isFetching && rows.length === 0;
  const isRefreshingRows = query.isFetching && rows.length > 0 && !isFetchingNextPage;
  const isEmpty = !query.isFetching && !query.isError && rows.length === 0;

  function getVisibleFilterOptions(filter: DataTableFilter) {
    const parentValue = filter.parentId ? filterValues[filter.parentId] : undefined;
    return parentValue ? filter.options.filter(_option => !_option.parentValue || _option.parentValue === parentValue) : filter.options;
  }

  function toggleExpandedRow(rowId: string) {
    setExpandedRowIds(_current => {
      const next = new Set(_current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, rowId: string) {
    if (!renderExpandedRow || (event.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) return;
    toggleExpandedRow(rowId);
  }

  return (
    <div aria-busy={query.isFetching} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <DynamicIcon icon="ph:magnifying-glass" fontSize="16px" />
          </span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-theme-accent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <DynamicIcon icon="ph:x" fontSize="14px" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 lg:hidden">
          {filters.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={`Buka filter${activeFilterCount ? `, ${activeFilterCount} aktif` : ''}`}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                isFiltering ? 'border-theme-light-border bg-theme-light text-gray-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <DynamicIcon icon={isFiltering ? 'ph:funnel-fill' : 'ph:funnel'} fontSize="15px" />
              Filter
              {activeFilterCount > 0 && <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] leading-none text-white">{activeFilterCount}</span>}
            </button>
          )}

          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Muat ulang"
            title="Muat ulang"
            className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DynamicIcon icon="ph:arrow-clockwise" fontSize="15px" className={query.isFetching ? 'animate-spin' : ''} />
          </button>

          {toolbar}
        </div>

        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {filters.map(_filter => {
            const visibleOptions = getVisibleFilterOptions(_filter);

            return (
              <Select
                key={`data_table__filter_${_filter.id}`}
                label={_filter.label}
                value={filterValues[_filter.id] ?? ''}
                onChange={value => setFilterValue(_filter.id, value)}
                options={[{ value: '', label: _filter.allLabel ?? `Semua ${_filter.label.toLowerCase()}` }, ...visibleOptions]}
                searchable={visibleOptions.length > 8}
                regexSearch={false}
                hideLabel
                compact
                className="w-44 sm:w-48"
              />
            );
          })}

          {isFiltering && (
            <button
              type="button"
              onClick={() => setFilterValues({})}
              aria-label="Bersihkan semua filter"
              title="Bersihkan semua filter"
              className="flex items-center justify-center rounded-xl border border-red-100 bg-red-50 p-2.5 text-red-400 transition-colors hover:border-red-200 hover:bg-red-100 hover:text-red-600"
            >
              <DynamicIcon icon="ph:funnel-x" fontSize="16px" />
            </button>
          )}

          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Muat ulang"
            title="Muat ulang"
            className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DynamicIcon icon="ph:arrow-clockwise" fontSize="16px" className={query.isFetching ? 'animate-spin' : ''} />
          </button>

          {toolbar}
        </div>
      </div>

      {query.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Gagal memuat data.{' '}
          <button type="button" onClick={() => query.refetch()} className="font-bold underline underline-offset-2">
            Coba lagi
          </button>
        </div>
      )}

      {isLoadingWithoutRows && <TableSkeleton />}

      {isEmpty && (
        <EmptyState
          icon={isSearching || isFiltering ? 'ph:magnifying-glass' : emptyIcon}
          title={isSearching || isFiltering ? 'Tidak ada hasil' : emptyTitle}
          description={
            isSearching ? `Tidak ada data yang cocok dengan "${debouncedSearch}".` : isFiltering ? 'Tidak ada data yang cocok dengan filter yang dipilih.' : emptyDescription
          }
        />
      )}

      {rows.length > 0 && (
        <div className={`-mx-4 overflow-x-auto px-4 transition-opacity ${query.isPlaceholderData || isRefreshingRows ? 'opacity-70' : 'opacity-100'}`}>
          <table className={`w-full min-w-full text-sm ${tableClassName}`}>
            <thead>
              {table.getHeaderGroups().map(_headerGroup => (
                <tr
                  key={`data_table__header_group_${_headerGroup.id}`}
                  className="border-b border-theme-light-border/40 bg-theme-light text-left text-[11px] uppercase tracking-wide text-gray-500"
                >
                  {renderExpandedRow && expanderPosition === 'start' && <th aria-label="Detail" className="w-10 min-w-10 rounded-l-lg px-2 py-2.5" />}
                  {_headerGroup.headers.map(_header => (
                    <th
                      key={`data_table__header_${_header.id}`}
                      className={`whitespace-nowrap px-3 py-2.5 font-semibold first:rounded-l-lg last:rounded-r-lg ${_header.column.columnDef.meta?.headerClassName ?? ''}`}
                    >
                      {_header.isPlaceholder ? null : flexRender(_header.column.columnDef.header, _header.getContext())}
                    </th>
                  ))}
                  {renderExpandedRow && expanderPosition === 'end' && <th aria-label="Detail" className="w-10 min-w-10 rounded-r-lg px-2 py-2.5" />}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map(_row => {
                const isExpanded = expandedRowIds.has(_row.id);

                return (
                  <Fragment key={`data_table__row_${_row.id}`}>
                    <tr
                      onClick={event => handleRowClick(event, _row.id)}
                      aria-expanded={renderExpandedRow ? isExpanded : undefined}
                      className={`group align-middle transition-colors hover:bg-theme-light/70 ${renderExpandedRow ? 'cursor-pointer' : ''}`}
                    >
                      {renderExpandedRow && expanderPosition === 'start' && (
                        <td className="w-10 min-w-10 border-b border-gray-50 px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRow(_row.id)}
                            aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}
                            className={`rounded-lg p-1 text-gray-400 transition-transform duration-200 hover:bg-gray-100 hover:text-gray-700 ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <DynamicIcon icon="ph:caret-down" fontSize="15px" />
                          </button>
                        </td>
                      )}
                      {_row.getAllCells().map(_cell => (
                        <td
                          key={`data_table__cell_${_cell.id}`}
                          className={`border-b border-gray-50 px-3 py-2.5 first:rounded-l-lg last:rounded-r-lg ${_cell.column.columnDef.meta?.className ?? ''}`}
                        >
                          {flexRender(_cell.column.columnDef.cell, _cell.getContext())}
                        </td>
                      ))}
                      {renderExpandedRow && expanderPosition === 'end' && (
                        <td className="w-10 min-w-10 border-b border-gray-50 px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRow(_row.id)}
                            aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}
                            className={`rounded-lg p-1 text-gray-400 transition-transform duration-200 hover:bg-gray-100 hover:text-gray-700 ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <DynamicIcon icon="ph:caret-down" fontSize="15px" />
                          </button>
                        </td>
                      )}
                    </tr>

                    {renderExpandedRow && (
                      <tr>
                        <td colSpan={_row.getAllCells().length + 1} className="p-0">
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                          >
                            <div className="overflow-hidden">{renderExpandedRow(_row.original)}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />

      {isFetchingNextPage && <TableNextPageLoader />}

      {!hasNextPage && rows.length > 0 && <p className="py-2 text-center text-[11px] text-gray-300">Semua data sudah ditampilkan</p>}

      <Sheet open={filterSheetOpen} title={filterTitle} onClose={() => setFilterSheetOpen(false)}>
        <div className="flex flex-col gap-4">
          {filters.map(_filter => {
            const visibleOptions = getVisibleFilterOptions(_filter);

            return (
              <Select
                key={`data_table__mobile_filter_${_filter.id}`}
                label={_filter.label}
                value={filterValues[_filter.id] ?? ''}
                onChange={value => setFilterValue(_filter.id, value)}
                options={[{ value: '', label: _filter.allLabel ?? `Semua ${_filter.label.toLowerCase()}` }, ...visibleOptions]}
                searchable={visibleOptions.length > 8}
                regexSearch={false}
              />
            );
          })}

          <div className="mt-1 flex gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setFilterValues({})}
              disabled={!isFiltering}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DynamicIcon icon="ph:funnel-x" fontSize="16px" />
              Reset
            </button>

            <button
              type="button"
              onClick={() => setFilterSheetOpen(false)}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-theme-primary px-4 py-3 text-sm font-bold text-gray-800 shadow-md shadow-theme-primary/30 transition-colors hover:bg-theme-secondary"
            >
              Lihat hasil{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
