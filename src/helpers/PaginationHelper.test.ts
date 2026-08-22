import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPage, cursorParamsSchema, decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, MAX_PAGE_SIZE } from './PaginationHelper';

type TestRow = { id: number };

function toPage(rows: TestRow[]) {
  return buildPage(
    rows,
    DEFAULT_PAGE_SIZE,
    _row => _row.id,
    _row => encodeCursor([_row.id]),
  );
}

test('ukuran halaman tabel dibatasi ke 15 baris', () => {
  assert.equal(DEFAULT_PAGE_SIZE, 15);
  assert.equal(MAX_PAGE_SIZE, 15);
  assert.equal(cursorParamsSchema.safeParse({ limit: 15 }).success, true);
  assert.equal(cursorParamsSchema.safeParse({ limit: 16 }).success, false);

  const rows = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_unused, _index) => ({ id: 100 - _index }));
  const page = toPage(rows);

  assert.equal(page.items.length, 15);
  assert.deepEqual(
    page.items,
    rows.slice(0, 15).map(_row => _row.id),
  );
  assert.deepEqual(decodeCursor(page.nextCursor ?? undefined), [String(rows[14].id)]);
});

test('cursor kosong bila jumlah baris tidak melewati batas halaman', () => {
  const exactPage = toPage(Array.from({ length: DEFAULT_PAGE_SIZE }, (_unused, _index) => ({ id: _index + 1 })));
  const shortPage = toPage([{ id: 1 }]);

  assert.equal(exactPage.items.length, 15);
  assert.equal(exactPage.nextCursor, null);
  assert.deepEqual(shortPage.items, [1]);
  assert.equal(shortPage.nextCursor, null);
});

test('cursor antarhalaman tidak menggandakan atau melewatkan baris', () => {
  const allRows = Array.from({ length: 31 }, (_unused, _index) => ({ id: 31 - _index }));
  const first = toPage(allRows.slice(0, DEFAULT_PAGE_SIZE + 1));
  const firstCursor = Number(decodeCursor(first.nextCursor ?? undefined)?.[0]);
  const secondCandidates = allRows.filter(_row => _row.id < firstCursor);
  const second = toPage(secondCandidates.slice(0, DEFAULT_PAGE_SIZE + 1));
  const secondCursor = Number(decodeCursor(second.nextCursor ?? undefined)?.[0]);
  const third = toPage(allRows.filter(_row => _row.id < secondCursor).slice(0, DEFAULT_PAGE_SIZE + 1));
  const combined = [...first.items, ...second.items, ...third.items];

  assert.equal(combined.length, 31);
  assert.equal(new Set(combined).size, 31);
  assert.deepEqual(
    combined,
    allRows.map(_row => _row.id),
  );
  assert.equal(third.nextCursor, null);
});
