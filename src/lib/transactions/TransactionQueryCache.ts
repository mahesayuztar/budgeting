import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { TransactionDTO } from './TransactionService';

type TransactionFilterValues = {
  type?: string;
  categoryUuid?: string;
  accountUuid?: string;
};

type TransactionQueryContext = {
  year: number;
  month: number;
  search: string;
  filters: TransactionFilterValues;
};

/**
 * Membaca konteks periode, pencarian, dan filter dari query key DataTable
 * transaksi. Bentuk yang tidak dikenali dilewati agar helper tidak mengubah
 * cache lain yang kebetulan memakai prefix serupa.
 * @param {QueryKey} queryKey - Query key kandidat dari QueryClient.
 * @returns {TransactionQueryContext | null} Konteks query atau null bila bentuknya tidak cocok.
 */
function readTransactionQueryContext(queryKey: QueryKey): TransactionQueryContext | null {
  if (queryKey[0] !== 'transactions' || typeof queryKey[1] !== 'number' || typeof queryKey[2] !== 'number') return null;

  const rawFilters = queryKey[4];
  const filters = rawFilters && typeof rawFilters === 'object' && !Array.isArray(rawFilters) ? (rawFilters as TransactionFilterValues) : {};

  return {
    year: queryKey[1],
    month: queryKey[2],
    search: typeof queryKey[3] === 'string' ? queryKey[3].trim().toLowerCase() : '',
    filters,
  };
}

/**
 * Menentukan apakah hasil mutasi harus terlihat pada satu varian cache tabel.
 * Logikanya sengaja sama dengan filter server supaya optimistic result tidak
 * muncul pada periode, pencarian, atau pilihan filter yang keliru.
 * @param {TransactionDTO} transaction - Transaksi hasil save.
 * @param {TransactionQueryContext} context - Konteks query cache yang diperiksa.
 * @returns {boolean} true bila transaksi termasuk hasil query tersebut.
 */
function matchesTransactionQuery(transaction: TransactionDTO, context: TransactionQueryContext) {
  const [year, month] = transaction.occurredAt.split('-').map(Number);
  if (year !== context.year || month !== context.month) return false;

  if (context.filters.type && transaction.type !== context.filters.type) return false;
  if (context.filters.categoryUuid && transaction.category?.uuid !== context.filters.categoryUuid) return false;

  if (context.filters.accountUuid && transaction.account?.uuid !== context.filters.accountUuid && transaction.toAccount?.uuid !== context.filters.accountUuid) {
    return false;
  }

  if (context.search) {
    const note = transaction.note?.toLowerCase() ?? '';
    const category = transaction.category?.name.toLowerCase() ?? '';
    if (!note.includes(context.search) && !category.includes(context.search)) return false;
  }

  return true;
}

/**
 * Mengganti satu transaksi pada halaman-halaman yang sudah termuat, lalu
 * mengurutkannya kembali berdasarkan tanggal. Kapasitas cache dipertahankan
 * agar optimistic insert tidak membuat ukuran halaman terus membesar; refetch
 * background setelahnya akan mengembalikan cursor dan urutan kanonik server.
 * @param {InfiniteData<Page<TransactionDTO>>} current - Isi cache infinite query saat ini.
 * @param {TransactionDTO} transaction - Transaksi hasil save.
 * @param {boolean} include - Apakah transaksi sesuai dengan filter cache ini.
 * @returns {InfiniteData<Page<TransactionDTO>>} Cache yang sudah disinkronkan.
 */
function upsertTransactionPages(current: InfiniteData<Page<TransactionDTO>>, transaction: TransactionDTO, include: boolean): InfiniteData<Page<TransactionDTO>> {
  if (current.pages.length === 0) return current;

  const pageSizes = current.pages.map(_page => _page.items.length);
  const capacity = pageSizes.reduce((_total, _size) => _total + _size, 0);
  const items = current.pages.flatMap(_page => _page.items).filter(_item => _item.uuid !== transaction.uuid);

  if (include) items.unshift(transaction);
  items.sort((_left, _right) => _right.occurredAt.localeCompare(_left.occurredAt));

  const visibleCapacity = Math.max(capacity, include ? 1 : 0);
  const visibleItems = items.slice(0, visibleCapacity);
  let offset = 0;

  const pages = current.pages.map((_page, _index) => {
    const size = _index === 0 && pageSizes[_index] === 0 && include ? 1 : pageSizes[_index];
    const pageItems = visibleItems.slice(offset, offset + size);
    offset += size;
    return { ..._page, items: pageItems };
  });

  return { ...current, pages };
}

/**
 * Memasukkan hasil create/update langsung ke seluruh cache tabel transaksi
 * yang sudah pernah dimuat. Ini membuat UI berubah pada frame yang sama dengan
 * respons save, sementara invalidasi query tetap berjalan di background untuk
 * memastikan cache akhirnya identik dengan database.
 * @param {QueryClient} queryClient - QueryClient milik pengguna saat ini.
 * @param {TransactionDTO} transaction - DTO transaksi dari respons API save.
 * @returns {void}
 */
export function syncSavedTransactionToCache(queryClient: QueryClient, transaction: TransactionDTO) {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['transactions'] });

  for (const _query of queries) {
    const context = readTransactionQueryContext(_query.queryKey);
    if (!context) continue;

    queryClient.setQueryData<InfiniteData<Page<TransactionDTO>>>(_query.queryKey, _current =>
      _current ? upsertTransactionPages(_current, transaction, matchesTransactionQuery(transaction, context)) : _current,
    );
  }
}
