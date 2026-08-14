"use client";

import { useState } from "react";
import { Button } from "@/src/core/components/ui/button";
import { ErrorAlert } from "@/src/core/components/ui/alert";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { useApiAction } from "@/src/core/hooks/use-api-action";
import { reportApi, type ReportPeriod } from "@/src/core/reports/report.api";
import { MONTH_NAMES_ID } from "@/src/core/lib/date";

export default function DownloadReport({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const { run, pending, error } = useApiAction(reportApi.downloadPdf);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        {(
          [
            { value: "monthly", label: "Bulanan" },
            { value: "yearly", label: "Tahunan" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              period === option.value
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Periode:{" "}
        <span className="font-semibold text-gray-700">
          {period === "yearly" ? year : `${MONTH_NAMES_ID[month - 1]} ${year}`}
        </span>
      </p>

      <ErrorAlert message={error} />

      <Button
        type="button"
        fullWidth
        disabled={pending}
        onClick={() => run(period, year, month)}
      >
        <DynamicIcon icon="ph:download-simple" fontSize="18px" />
        {pending ? "Menyiapkan PDF..." : "Download PDF"}
      </Button>
    </div>
  );
}
