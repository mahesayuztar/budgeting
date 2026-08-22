import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { DebtDTO } from './DebtService';

/** Mengganti debt hasil mutasi langsung pada semua halaman cache yang memuatnya. */
export function syncSavedDebtToCache(queryClient: QueryClient, debt: DebtDTO) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ['debts'] })) {
    queryClient.setQueryData<InfiniteData<Page<DebtDTO>>>(query.queryKey, _current => {
      if (!_current) return _current;
      return {
        ..._current,
        pages: _current.pages.map(_page => ({
          ..._page,
          items: _page.items.map(_item => (_item.uuid === debt.uuid ? debt : _item)),
        })),
      };
    });
  }
}
