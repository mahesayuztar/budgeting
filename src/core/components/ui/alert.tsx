export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      {message}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
    >
      {message}
    </div>
  );
}
