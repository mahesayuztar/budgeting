"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MONTH_NAMES_ID } from "@/src/core/lib/date";
import { markRouteTransitionStart } from "@/src/core/lib/route-transition";

export default function PeriodSwitcher({
  year,
  month,
  basePath,
}: {
  year: number;
  month: number;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(next: { year?: number; month?: number }) {
    const params = new URLSearchParams(searchParams);
    params.set("year", String(next.year ?? year));
    params.set("month", String(next.month ?? month));
    markRouteTransitionStart();
    router.push(`${basePath}?${params.toString()}`);
  }

  const years = Array.from({ length: 5 }, (_, i) => year - 2 + i);

  return (
    <div className="flex gap-2">
      <select
        aria-label="Bulan"
        value={month}
        onChange={(event) => update({ month: Number(event.target.value) })}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-theme-accent"
      >
        {MONTH_NAMES_ID.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>

      <select
        aria-label="Tahun"
        value={year}
        onChange={(event) => update({ year: Number(event.target.value) })}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-theme-accent"
      >
        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}
