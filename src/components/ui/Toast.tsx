'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import DynamicIcon from '@/src/components/commons/DynamicIcon';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
};

export type ToastEntry = ToastInput & {
  id: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  show: (input: ToastInput) => string;
  success: (title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => string;
  error: (title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => string;
  warning: (title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => string;
  info: (title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => string;
  dismiss: (id: string) => void;
};

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION = 5_000;
const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLE: Record<ToastVariant, { icon: string; iconClass: string; progressClass: string }> = {
  success: { icon: 'ph:check-circle-fill', iconClass: 'bg-emerald-50 text-emerald-600', progressClass: 'bg-emerald-500' },
  error: { icon: 'ph:x-circle-fill', iconClass: 'bg-red-50 text-red-600', progressClass: 'bg-red-500' },
  warning: { icon: 'ph:warning-circle-fill', iconClass: 'bg-amber-50 text-amber-600', progressClass: 'bg-amber-500' },
  info: { icon: 'ph:info-fill', iconClass: 'bg-blue-50 text-blue-600', progressClass: 'bg-blue-500' },
};

export function limitToastStack(entries: ToastEntry[]) {
  return entries.slice(-MAX_VISIBLE_TOASTS);
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const remainingRef = useRef(entry.duration);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = VARIANT_STYLE[entry.variant];

  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => onDismiss(entry.id), remainingRef.current);
  }, [entry.id, onDismiss]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  function pause() {
    if (paused) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    setPaused(true);
  }

  function resume() {
    if (!paused || actionPending) return;
    setPaused(false);
    startTimer();
  }

  async function runAction() {
    if (!entry.action || actionPending) return;
    pause();
    setActionPending(true);
    try {
      await entry.action.onClick();
      onDismiss(entry.id);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <article
      role={entry.variant === 'error' || entry.variant === 'warning' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="toast-enter pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-[0_18px_55px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-3 p-3.5 pr-11 sm:p-4 sm:pr-12">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconClass}`}>
          <DynamicIcon icon={style.icon} fontSize="19px" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-bold leading-snug text-gray-800">{entry.title}</p>
          {entry.description && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{entry.description}</p>}
          {entry.action && (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => void runAction()}
              className="mt-2.5 inline-flex min-h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-theme-light-border hover:bg-theme-light disabled:opacity-50"
            >
              {actionPending ? 'Memproses...' : entry.action.label}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(entry.id)}
        aria-label="Tutup notifikasi"
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <DynamicIcon icon="ph:x" fontSize="15px" />
      </button>
      <div className="h-1 bg-gray-100">
        <div
          className={`toast-progress h-full origin-left ${style.progressClass}`}
          style={{ animationDuration: `${entry.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      </div>
    </article>
  );
}

/** Provider dan viewport toast global yang bertahan saat navigasi antarrute app. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: string) => setEntries(_current => _current.filter(_entry => _entry.id !== id)), []);
  const show = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setEntries(_current => limitToastStack([..._current, { ...input, id, variant: input.variant ?? 'info', duration: input.duration ?? DEFAULT_DURATION }]));
    return id;
  }, []);

  const success = useCallback((title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => show({ ...options, title, variant: 'success' }), [show]);
  const error = useCallback(
    (title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => show({ ...options, title, variant: 'error', duration: options?.duration ?? 7_000 }),
    [show],
  );
  const warning = useCallback((title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => show({ ...options, title, variant: 'warning' }), [show]);
  const info = useCallback((title: string, options?: Omit<ToastInput, 'title' | 'variant'>) => show({ ...options, title, variant: 'info' }), [show]);
  const value = useMemo<ToastContextValue>(() => ({ show, success, error, warning, info, dismiss }), [dismiss, error, info, show, success, warning]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifikasi"
        className="pointer-events-none fixed inset-x-3 bottom-[5.5rem] z-[80] flex flex-col-reverse gap-2.5 md:inset-x-auto md:bottom-auto md:right-6 md:top-20 md:w-[min(24rem,calc(100vw-3rem))]"
      >
        {entries.map(_entry => (
          <ToastItem key={_entry.id} entry={_entry} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider.');
  return context;
}
