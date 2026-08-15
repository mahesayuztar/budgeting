'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MONTH_NAMES_ID } from '@/src/helpers/DateHelper';
import { markRouteTransitionStart } from '@/src/lib/RouteTransition';

type PeriodSwitcherOwnProps = {
  year: number;
  month: number;
  basePath: string;
};

/**
 * Pemilih periode bulan dan tahun. Periode disimpan di query string, bukan di
 * state komponen, supaya halaman yang membacanya dapat dirender di server dan
 * tautannya tetap dapat dibagikan.
 * @param {PeriodSwitcherOwnProps} props - Props komponen.
 * @param {number} props.year - Tahun yang sedang dipilih.
 * @param {number} props.month - Bulan yang sedang dipilih dengan Januari bernilai 1.
 * @param {string} props.basePath - Path halaman tujuan saat periode berganti.
 * @returns {ReactNode} Sepasang dropdown pemilih bulan dan tahun.
 */
export default function PeriodSwitcher({ year, month, basePath }: PeriodSwitcherOwnProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const yearOptions = Array.from({ length: 5 }, (_unused, _index) => year - 2 + _index);

  function setPeriod(next: { year?: number; month?: number }) {
    const params = new URLSearchParams(searchParams);
    params.set('year', String(next.year ?? year));
    params.set('month', String(next.month ?? month));

    markRouteTransitionStart();
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <select
        aria-label="Bulan"
        value={month}
        onChange={event => setPeriod({ month: Number(event.target.value) })}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-theme-accent"
      >
        {MONTH_NAMES_ID.map((_name, _index) => (
          <option key={`period_switcher__month_${_name}`} value={_index + 1}>
            {_name}
          </option>
        ))}
      </select>

      <select
        aria-label="Tahun"
        value={year}
        onChange={event => setPeriod({ year: Number(event.target.value) })}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-theme-accent"
      >
        {yearOptions.map(_value => (
          <option key={`period_switcher__year_${_value}`} value={_value}>
            {_value}
          </option>
        ))}
      </select>
    </div>
  );
}
