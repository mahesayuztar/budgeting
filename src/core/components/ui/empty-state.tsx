import DynamicIcon from "@/src/core/components/commons/dynamic-icon";

export function EmptyState({
  icon = "ph:tray",
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {/* Lingkaran krem: sentuhan hangat di state kosong, tanpa mewarnai
          area data. */}
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-theme-light text-theme-light-border">
        <DynamicIcon icon={icon} fontSize="26px" />
      </span>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {description && <p className="max-w-xs text-xs text-gray-400">{description}</p>}
    </div>
  );
}
