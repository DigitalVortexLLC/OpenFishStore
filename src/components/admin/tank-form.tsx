import type { Tank } from "@prisma/client";

import { ActionForm } from "@/components/admin/action-form";
import { Field, Select } from "@/components/admin/ui";
import { createTank, updateTank } from "@/app/admin/actions";
import { TANK_PURPOSES, WATER_TYPES } from "@/lib/constants";

export function TankForm({ tank }: { tank?: Tank }) {
  return (
    <ActionForm
      action={tank ? updateTank : createTank}
      submitLabel={tank ? "Save tank" : "Add tank"}
      resetOnSuccess={!tank}
      className="grid gap-3 sm:grid-cols-2"
    >
      {tank && <input type="hidden" name="id" value={tank.id} />}
      <Field label="Name" htmlFor="name">
        <input id="name" name="name" required defaultValue={tank?.name} className="input" placeholder="e.g. FW-12" />
      </Field>
      <Field label="System" htmlFor="system">
        <input id="system" name="system" defaultValue={tank?.system ?? ""} className="input" placeholder="Shared filtration, e.g. Reef Rack A" />
      </Field>
      <Field label="Water type" htmlFor="waterType">
        <Select name="waterType" options={WATER_TYPES} defaultValue={tank?.waterType} />
      </Field>
      <Field label="Purpose" htmlFor="purpose">
        <Select name="purpose" options={TANK_PURPOSES} defaultValue={tank?.purpose} />
      </Field>
      <Field label="Volume (gal)" htmlFor="volumeGallons">
        <input id="volumeGallons" name="volumeGallons" type="number" step="any" min="0" required defaultValue={tank?.volumeGallons} className="input" />
      </Field>
      <Field label="Location" htmlFor="location">
        <input id="location" name="location" defaultValue={tank?.location ?? ""} className="input" placeholder="Sales floor, back room…" />
      </Field>
      <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
        <textarea id="notes" name="notes" rows={2} defaultValue={tank?.notes ?? ""} className="input" />
      </Field>
      {tank && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="active" defaultChecked={tank.active} /> Active
        </label>
      )}
    </ActionForm>
  );
}
