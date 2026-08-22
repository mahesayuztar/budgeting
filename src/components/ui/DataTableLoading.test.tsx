import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TableNextPageLoader, TableSkeleton } from './DataTable';

test('skeleton tabel memiliki animasi dan status pemuatan aksesibel', () => {
  const markup = renderToStaticMarkup(<TableSkeleton />);

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-label="Memuat data tabel"/);
  assert.match(markup, /animate-pulse/);
});

test('loader halaman berikutnya menampilkan spinner tanpa bergantung pada ikon jaringan', () => {
  const markup = renderToStaticMarkup(<TableNextPageLoader />);

  assert.match(markup, /role="status"/);
  assert.match(markup, /animate-spin/);
  assert.match(markup, /Memuat data berikutnya/);
});
