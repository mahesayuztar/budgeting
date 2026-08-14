"use client";

import { useEffect } from "react";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";
import { Button } from "@/src/core/components/ui/button";

type ConfirmModalVariant = "danger" | "primary";

const ICON_STYLES: Record<ConfirmModalVariant, string> = {
  danger: "bg-red-50 text-red-600",
  primary: "bg-theme-light text-theme-light-border",
};

export function ConfirmModal({
  open,
  title,
  description,
  icon = "ph:warning-circle",
  variant = "danger",
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  /** Nama ikon Iconify, contoh: "ph:trash", "ph:sign-out". */
  icon?: string;
  variant?: ConfirmModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl"
      >
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${ICON_STYLES[variant]}`}
        >
          <DynamicIcon icon={icon} fontSize="26px" />
        </span>

        <h2 className="mt-4 text-base font-bold text-gray-800">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500">{description}</p>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Memproses..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
