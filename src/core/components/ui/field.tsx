import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const CONTROL =
  "w-full rounded-xl border bg-white px-4 py-3 text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400";

/** `errors` sengaja berbentuk string[] agar cocok langsung dengan `fieldErrors`. */
type FieldShellProps = {
  label: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
};

export function FieldShell({ label, errors, hint, children }: FieldShellProps) {
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

export function Input({ label, errors, hint, className = "", ...rest }: InputProps) {
  return (
    <FieldShell label={label} errors={errors} hint={hint}>
      <input
        {...rest}
        className={`${CONTROL} ${borderClass(Boolean(errors?.length))} ${className}`}
      />
    </FieldShell>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  errors?: string[];
  hint?: string;
};

export function Select({ label, errors, hint, className = "", children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} errors={errors} hint={hint}>
      <select
        {...rest}
        className={`${CONTROL} ${borderClass(Boolean(errors?.length))} ${className}`}
      >
        {children}
      </select>
    </FieldShell>
  );
}
