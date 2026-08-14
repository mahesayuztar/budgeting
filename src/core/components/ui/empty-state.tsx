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
      <span className="text-gray-300">
        <DynamicIcon icon={icon} fontSize="32px" />
      </span>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {description && <p className="max-w-xs text-xs text-gray-400">{description}</p>}
    </div>
  );
}
