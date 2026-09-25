import type { ReactNode } from "react";

import { label } from "@/lib/constants";
import type { Grade } from "@/lib/water";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const TONES = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-ocean-100 text-ocean-800",
  purple: "bg-violet-100 text-violet-800",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  QUARANTINE: "yellow",
  AVAILABLE: "green",
  HOLD: "purple",
  SOLD_OUT: "gray",
  REQUESTED: "yellow",
  ORDERED: "blue",
  ARRIVED: "purple",
  NOTIFIED: "blue",
  COMPLETED: "green",
  CANCELLED: "gray",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "gray"}>{label(status)}</Badge>;
}

const GRADE_TONES: Record<Grade, Tone> = { ok: "green", warn: "yellow", critical: "red" };
const GRADE_LABELS: Record<Grade, string> = { ok: "In range", warn: "Watch", critical: "Action needed" };

export function GradeBadge({ grade, children }: { grade: Grade; children?: ReactNode }) {
  return <Badge tone={GRADE_TONES[grade]}>{children ?? GRADE_LABELS[grade]}</Badge>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">{children}</p>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "yellow" }) {
  const color = tone === "red" ? "text-red-700" : tone === "yellow" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

export function Select({ name, options, defaultValue, id, required }: { name: string; options: readonly (string | { value: string; label: string })[]; defaultValue?: string; id?: string; required?: boolean }) {
  return (
    <select id={id ?? name} name={name} defaultValue={defaultValue} required={required} className="input">
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: label(o) } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function Field({ label: text, htmlFor, children, className = "" }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {text}
      </label>
      {children}
    </div>
  );
}
