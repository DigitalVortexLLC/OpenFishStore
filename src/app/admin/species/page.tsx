import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { Badge, Card, EmptyState, Field, PageHeader, Select, Table, Td } from "@/components/admin/ui";
import { CARE_LEVELS, label, SPECIES_CATEGORIES, TEMPERAMENTS, WATER_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";

import { createSpecies } from "../actions";

export const metadata: Metadata = { title: "Species" };
export const dynamic = "force-dynamic";

export default async function SpeciesPage() {
  const species = await db.species.findMany({
    orderBy: [{ category: "asc" }, { commonName: "asc" }],
    include: { batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } } },
  });

  return (
    <>
      <PageHeader title="Species catalog" description="Care information shared by every batch of a species." />
      <Card>
        {!species.length ? (
          <EmptyState>No species yet.</EmptyState>
        ) : (
          <Table head={["Species", "Category", "Water", "Care", "Temperament", "Reef safe", "Min tank", "In stock"]}>
            {species.map((s) => (
              <tr key={s.id}>
                <Td>
                  <p className="font-medium">{s.commonName}</p>
                  {s.scientificName && <p className="text-xs text-slate-500 italic">{s.scientificName}</p>}
                </Td>
                <Td>{label(s.category)}</Td>
                <Td>{label(s.waterType)}</Td>
                <Td><Badge tone={s.careLevel === "EXPERT" ? "red" : s.careLevel === "MODERATE" ? "yellow" : "green"}>{label(s.careLevel)}</Badge></Td>
                <Td>{label(s.temperament)}</Td>
                <Td>{s.reefSafe === null ? "—" : s.reefSafe ? "Yes" : "No"}</Td>
                <Td>{s.minTankGallons ? `${s.minTankGallons} gal` : "—"}</Td>
                <Td className="font-semibold">{s.batches.reduce((sum, b) => sum + b.quantity, 0)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Add species" className="mt-6">
        <ActionForm action={createSpecies} submitLabel="Add species" className="grid gap-3 sm:grid-cols-3">
          <Field label="Common name" htmlFor="commonName">
            <input id="commonName" name="commonName" required className="input" />
          </Field>
          <Field label="Scientific name" htmlFor="scientificName">
            <input id="scientificName" name="scientificName" className="input" />
          </Field>
          <Field label="Category" htmlFor="category">
            <Select name="category" options={SPECIES_CATEGORIES} />
          </Field>
          <Field label="Water type" htmlFor="waterType">
            <Select name="waterType" options={WATER_TYPES} />
          </Field>
          <Field label="Care level" htmlFor="careLevel">
            <Select name="careLevel" options={CARE_LEVELS} />
          </Field>
          <Field label="Temperament" htmlFor="temperament">
            <Select name="temperament" options={TEMPERAMENTS} />
          </Field>
          <Field label="Reef safe" htmlFor="reefSafe">
            <Select name="reefSafe" options={[{ value: "", label: "N/A" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          </Field>
          <Field label="Min tank (gal)" htmlFor="minTankGallons">
            <input id="minTankGallons" name="minTankGallons" type="number" min={0} className="input" />
          </Field>
          <Field label="Max size (in)" htmlFor="maxSizeInches">
            <input id="maxSizeInches" name="maxSizeInches" type="number" step="0.1" min={0} className="input" />
          </Field>
          <Field label="Diet" htmlFor="diet">
            <input id="diet" name="diet" className="input" />
          </Field>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
            <input id="notes" name="notes" className="input" placeholder="Acclimation, compatibility, feeding tips…" />
          </Field>
        </ActionForm>
      </Card>
    </>
  );
}
