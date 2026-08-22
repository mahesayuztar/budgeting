import assert from 'node:assert/strict';
import test from 'node:test';
import { LatestTaskQueue } from './LatestTaskQueue';

test('single-flight tidak menjalankan worker secara paralel dan hanya mengirim snapshot terbaru', async () => {
  const processed: number[] = [];
  let releaseFirst: (() => void) | undefined;
  let active = 0;
  let maxActive = 0;
  const queue = new LatestTaskQueue<number>(async value => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    processed.push(value);
    if (value === 1) await new Promise<void>(_resolve => (releaseFirst = _resolve));
    active -= 1;
  });

  const running = queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);
  releaseFirst?.();
  await running;

  assert.equal(maxActive, 1);
  assert.deepEqual(processed, [1, 3]);
});

test('worker dapat menghentikan dan membersihkan snapshot antrean', async () => {
  const processed: number[] = [];
  let release: (() => void) | undefined;
  const queue = new LatestTaskQueue<number>(async value => {
    processed.push(value);
    await new Promise<void>(_resolve => (release = _resolve));
    return false;
  });
  const running = queue.enqueue(1);
  queue.enqueue(2);
  release?.();
  await running;
  assert.deepEqual(processed, [1]);
});
