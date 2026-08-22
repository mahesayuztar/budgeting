/**
 * Antrean single-flight yang hanya mempertahankan nilai terbaru selama worker
 * berjalan. Cocok untuk autosave: request aktif diselesaikan, perubahan tengah
 * dibuang, lalu snapshot paling baru dikirim berikutnya.
 */
export class LatestTaskQueue<T> {
  private queued: T | undefined;
  private running: Promise<void> | null = null;

  constructor(private readonly worker: (value: T) => Promise<boolean | void>) {}

  enqueue(value: T) {
    this.queued = value;
    if (!this.running) {
      this.running = this.drain().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  whenIdle() {
    return this.running ?? Promise.resolve();
  }

  clear() {
    this.queued = undefined;
  }

  private async drain() {
    while (this.queued !== undefined) {
      const value = this.queued;
      this.queued = undefined;
      const shouldContinue = await this.worker(value);
      if (shouldContinue === false) this.clear();
    }
  }
}
