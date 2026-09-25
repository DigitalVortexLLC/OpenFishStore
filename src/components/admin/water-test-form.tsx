import { ActionForm } from "@/components/admin/action-form";
import { logWaterTest } from "@/app/admin/actions";
import type { WaterType } from "@/lib/constants";
import { WATER_PARAMETERS, WATER_TARGETS } from "@/lib/water";

const STEP: Record<string, string> = { salinity: "0.001", ammonia: "0.01", nitrite: "0.01", phosphate: "0.01", ph: "0.1" };

export function WaterTestForm({ tankId, waterType }: { tankId: string; waterType: WaterType }) {
  // Only offer the parameters that matter for this water type.
  const params = WATER_PARAMETERS.filter(
    (p) => WATER_TARGETS[waterType][p.key] || ["temperatureF", "ph"].includes(p.key),
  );
  return (
    <ActionForm action={logWaterTest} submitLabel="Log test" className="space-y-4">
      <input type="hidden" name="tankId" value={tankId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {params.map((p) => {
          const target = WATER_TARGETS[waterType][p.key]?.ok;
          return (
            <div key={p.key}>
              <label htmlFor={`wt-${p.key}`} className="field-label">
                {p.label} {p.unit && <span className="normal-case">({p.unit})</span>}
              </label>
              <input
                id={`wt-${p.key}`}
                name={p.key}
                type="number"
                step={STEP[p.key] ?? "any"}
                inputMode="decimal"
                placeholder={target ? `${target[0]}–${target[1]}` : ""}
                className="input"
              />
            </div>
          );
        })}
      </div>
      <div>
        <label htmlFor="wt-notes" className="field-label">Notes</label>
        <input id="wt-notes" name="notes" className="input" placeholder="Water change, dosing, observations…" />
      </div>
    </ActionForm>
  );
}
