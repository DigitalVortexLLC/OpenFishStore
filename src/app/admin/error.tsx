"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm">{error.message || "An unexpected error occurred."}</p>
      <button onClick={reset} className="btn mt-4">
        Try again
      </button>
    </div>
  );
}
