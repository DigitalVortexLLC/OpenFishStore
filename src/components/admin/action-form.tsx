"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";

import type { ActionState } from "@/lib/form";

/** A form bound to a server action that returns { ok, message }. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
        {submitLabel && (
          <div className="flex items-center gap-3">
            <button className="btn">{pending ? "Saving…" : submitLabel}</button>
            {state?.message && (
              <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
                {state.message}
              </p>
            )}
          </div>
        )}
      </fieldset>
      {!submitLabel && state?.message && (
        <p role="status" className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
