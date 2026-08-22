import assert from 'node:assert/strict';
import test from 'node:test';
import { limitToastStack, type ToastEntry } from './Toast';

function entry(id: string): ToastEntry {
  return { id, title: id, variant: 'info', duration: 5_000 };
}

test('toast stack membatasi empat notifikasi terbaru', () => {
  assert.deepEqual(
    limitToastStack(['1', '2', '3', '4', '5'].map(entry)).map(_entry => _entry.id),
    ['2', '3', '4', '5'],
  );
});

test('toast action dapat membawa callback async', async () => {
  let called = false;
  const toast: ToastEntry = {
    ...entry('undo'),
    action: {
      label: 'Urungkan',
      onClick: async () => {
        called = true;
      },
    },
  };
  await toast.action?.onClick();
  assert.equal(called, true);
});
