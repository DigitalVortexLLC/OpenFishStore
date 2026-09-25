import type { CareInfo } from "@/lib/commerce/types";
import { label } from "@/lib/constants";

export function CareSheet({ care }: { care: CareInfo }) {
  const rows: [string, string][] = [];
  if (care.waterType) rows.push(["Water", label(care.waterType)]);
  if (care.careLevel) rows.push(["Care level", label(care.careLevel)]);
  if (care.temperament) rows.push(["Temperament", label(care.temperament)]);
  if (care.reefSafe !== undefined) rows.push(["Reef safe", care.reefSafe ? "Yes" : "No"]);
  if (care.minTankGallons) rows.push(["Min. tank size", `${care.minTankGallons} gal`]);
  if (care.maxSizeInches) rows.push(["Adult size", `${care.maxSizeInches}″`]);
  if (care.diet) rows.push(["Diet", care.diet]);
  if (!rows.length) return null;

  return (
    <section className="rounded-xl border border-ocean-100 bg-ocean-50/60 p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ocean-900 uppercase">Care sheet</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-ocean-100 pb-1">
            <dt className="text-slate-600">{k}</dt>
            <dd className="font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LiveArrivalNote() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Live animal</p>
      <p className="mt-1">
        Every animal is quarantined and observed eating before sale. Choose in-store pickup at checkout,
        or overnight shipping with our live-arrival guarantee.
      </p>
    </div>
  );
}
