import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Page } from '@/src/helpers/PaginationHelper';
import type { SplitBillListDTO } from './SplitBillDto';

/** Menghapus bill dari seluruh halaman history yang sudah ada di cache. */
export function removeSplitBillFromCache(queryClient: QueryClient, uuid: string) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ['split-bills'] })) {
    queryClient.setQueryData<InfiniteData<Page<SplitBillListDTO>>>(query.queryKey, _current => {
      if (!_current) return _current;
      return {
        ..._current,
        pages: _current.pages.map(_page => ({ ..._page, items: _page.items.filter(_item => _item.uuid !== uuid) })),
      };
    });
  }
}
