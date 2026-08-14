"use client";

import {
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";

const CONTROL =
  "w-full rounded-xl border bg-white px-4 py-3 text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400";

type FieldShellProps = {
  label: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
};

export function FieldShell({
  label,
  errors,
  hint,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>

      {children}

      {hint && !errors?.length && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}

      {errors?.map((message) => (
        <p key={message} className="text-xs font-medium text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

function borderClass(hasError: boolean) {
  return hasError
    ? "border-red-300 focus:border-red-400"
    : "border-gray-200 focus:border-theme-accent";
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errors?: string[];
  hint?: string;
};

export function Input({
  label,
  errors,
  hint,
  className = "",
  ...rest
}: InputProps) {
  return (
    <FieldShell label={label} errors={errors} hint={hint}>
      <input
        {...rest}
        className={`${CONTROL} ${borderClass(Boolean(errors?.length))} ${className}`}
      />
    </FieldShell>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectProps = {
  label: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  errors?: string[];
  hint?: string;
  disabled?: boolean;
  searchable?: boolean;
  regexSearch?: boolean;
  name?: string;
  className?: string;
};

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Pilih opsi",
  searchPlaceholder = "Cari...",
  errors,
  hint,
  disabled = false,
  searchable = true,
  regexSearch = true,
  name,
  className = "",
}: SelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const query = search.trim();

    if (!query) {
      return options;
    }

    if (regexSearch) {
      try {
        const regex = new RegExp(query, "i");

        return options.filter(
          (option) =>
            regex.test(option.label) ||
            regex.test(option.value) ||
            regex.test(option.description ?? ""),
        );
      } catch {
        //
      }
    }

    const normalized = query.toLowerCase();

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized) ||
        option.description?.toLowerCase().includes(normalized),
    );
  }, [options, regexSearch, search]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSelect(option: SelectOption) {
    if (option.disabled) return;

    onChange(option.value);
    setOpen(false);
    setSearch("");
  }

  return (
    <FieldShell label={label} errors={errors} hint={hint}>
      <div ref={wrapperRef} className={`relative ${className}`}>
        {name && <input type="hidden" name={name} value={value ?? ""} />}

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((prev) => !prev);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left outline-none transition-all duration-200 ${
            errors?.length
              ? "border-red-300 focus:border-red-400"
              : open
                ? "border-theme-accent ring-2 ring-theme-accent/10"
                : "border-gray-200 hover:border-gray-300"
          } ${
            disabled
              ? "cursor-not-allowed bg-gray-50 text-gray-400"
              : "cursor-pointer"
          }`}
        >
          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              selected ? "font-medium text-gray-800" : "text-gray-400"
            }`}
          >
            {selected?.label ?? placeholder}
          </span>

          <DynamicIcon
            icon="ph:caret-down"
            fontSize="16px"
            className={`shrink-0 text-gray-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && !disabled && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60">
            {searchable && (
              <div className="border-b border-gray-100 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3">
                  <DynamicIcon
                    icon="ph:magnifying-glass"
                    fontSize="15px"
                    className="shrink-0 text-gray-400"
                  />

                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-200 hover:text-gray-600"
                    >
                      <DynamicIcon icon="ph:x" fontSize="14px" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              role="listbox"
              className="max-h-64 overflow-y-auto p-1.5"
            >
              {filteredOptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center">
                  <DynamicIcon
                    icon="ph:magnifying-glass"
                    fontSize="22px"
                    className="text-gray-300"
                  />

                  <p className="text-sm font-medium text-gray-500">
                    Tidak ditemukan
                  </p>

                  <p className="text-xs text-gray-400">
                    Coba gunakan kata kunci lain.
                  </p>
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const active = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "bg-theme-light text-gray-900"
                          : "text-gray-700 hover:bg-gray-50"
                      } ${
                        option.disabled
                          ? "cursor-not-allowed opacity-40"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {option.label}
                        </p>

                        {option.description && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {option.description}
                          </p>
                        )}
                      </div>

                      {active && (
                        <DynamicIcon
                          icon="ph:check"
                          fontSize="16px"
                          className="shrink-0 text-gray-700"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {regexSearch && searchable && search && (
              <div className="border-t border-gray-100 px-3 py-2">
                <p className="truncate font-mono text-[10px] text-gray-400">
                  /{search}/i
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </FieldShell>
  );
}