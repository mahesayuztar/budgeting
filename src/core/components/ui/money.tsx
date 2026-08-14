import { formatIDR } from "@/src/core/lib/money";

type Tone = "auto" | "income" | "expense" | "neutral";

const TONES: Record<Exclude<Tone, "auto">, string> = {
  income: "text-emerald-600",
  expense: "text-red-500",
  neutral: "text-gray-800",
};

export function Money({
  value,
  tone = "neutral",
  className = "",
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone === "auto" ? (value < 0 ? "expense" : "income") : tone;

  return (
    <span className={`tabular-nums ${TONES[resolved]} ${className}`}>
      {formatIDR(value)}
    </span>
  );
}
