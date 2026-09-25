import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/admin/action-form";
import { Badge, Card, Field, PageHeader, Select, StatusBadge } from "@/components/admin/ui";
import { BATCH_STATUSES, label, MANUAL_EVENT_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { daysBetween, formatCents, formatDate, formatDateTime } from "@/lib/format";
import { isAdminConfigured } from "@/lib/shopify/admin";

import { linkVariant, moveLivestock, recordLivestockEvent, setBatchStatus } from "../../actions";

export const dynamic = "force-dynamic";

export default async function BatchPage(props: PageProps<"/admin/livestock/[id]">) {
  const { id } = await props.params;
  const [batch, tanks] = await Promise.all([
    db.livestockBatch.findUnique({
      where: { id },
      include: {
        species: true,
        tank: true,
        events: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      },
    }),
    db.tank.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!batch) notFound();

  const losses = batch.events.filter((e) => e.type === "LOSS").reduce((s, e) => s - e.quantityDelta, 0);
  const sold = batch.events.filter((e) => e.type === "SOLD").reduce((s, e) => s - e.quantityDelta, 0);
  const survival = batch.receivedQuantity ? Math.round(((batch.receivedQuantity - losses) / batch.receivedQuantity) * 100) : 100;

  return (
    <>
      <PageHeader
        title={`${batch.species.commonName} · ${batch.quantity} left`}
        description={`Received ${formatDate(batch.receivedAt)} (${daysBetween(batch.receivedAt, new Date())} days ago)${batch.supplier ? ` from ${batch.supplier}` : ""}`}
        actions={<Link href="/admin/livestock" className="btn-secondary">← All livestock</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-slate-500">Status</dt><dd className="mt-1"><StatusBadge status={batch.status} /></dd></div>
              <div><dt className="text-slate-500">Tank</dt><dd className="mt-1 font-medium"><Link href={`/admin/tanks/${batch.tankId}`} className="hover:text-ocean-700">{batch.tank.name}</Link></dd></div>
              <div><dt className="text-slate-500">Sold / lost</dt><dd className="mt-1 font-medium">{sold} / {losses}</dd></div>
              <div><dt className="text-slate-500">Survival</dt><dd className="mt-1 font-medium">{survival}%</dd></div>
              {batch.unitCostCents !== null && (
                <div><dt className="text-slate-500">Unit cost</dt><dd className="mt-1 font-medium">{formatCents(batch.unitCostCents)}</dd></div>
              )}
              {batch.quarantineUntil && (
                <div><dt className="text-slate-500">Quarantine until</dt><dd className="mt-1 font-medium">{formatDate(batch.quarantineUntil)}</dd></div>
              )}
            </dl>
            {batch.notes && <p className="mt-4 text-sm text-slate-600">{batch.notes}</p>}
          </Card>

          <Card title="Record sale, loss or treatment">
            <ActionForm action={recordLivestockEvent} submitLabel="Record" className="grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="batchId" value={batch.id} />
              <Field label="Type" htmlFor="type">
                <Select name="type" options={MANUAL_EVENT_TYPES} />
              </Field>
              <Field label="Quantity" htmlFor="quantity">
                <input id="quantity" name="quantity" type="number" min={0} defaultValue={1} className="input" />
              </Field>
              <Field label="Adjustment" htmlFor="direction">
                <Select name="direction" options={[{ value: "remove", label: "Remove" }, { value: "add", label: "Add" }]} />
              </Field>
              <Field label="Note" htmlFor="note">
                <input id="note" name="note" className="input" placeholder="Cause, medication…" />
              </Field>
            </ActionForm>
            <p className="mt-2 text-xs text-slate-500">
              In-store sales, losses and recounts on available stock are pushed to Shopify inventory automatically.
            </p>
          </Card>

          <Card title="History">
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {batch.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-ocean-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.type === "LOSS" ? "red" : e.type === "SOLD" ? "green" : "blue"}>{label(e.type)}</Badge>
                    {e.quantityDelta !== 0 && (
                      <span className="font-medium">{e.quantityDelta > 0 ? `+${e.quantityDelta}` : e.quantityDelta}</span>
                    )}
                    <span className="text-slate-500">
                      {formatDateTime(e.createdAt)} · {e.source === "SHOPIFY" ? "Shopify" : (e.user?.name ?? "System")}
                    </span>
                  </div>
                  {e.note && <p className="mt-1 text-slate-600">{e.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <ActionForm action={setBatchStatus} submitLabel="Update status" resetOnSuccess={false} className="space-y-3">
              <input type="hidden" name="batchId" value={batch.id} />
              <Select name="status" options={BATCH_STATUSES} defaultValue={batch.status} />
              <p className="text-xs text-slate-500">Only Available batches count toward stock sold online.</p>
            </ActionForm>
          </Card>

          <Card title="Move to another tank">
            <ActionForm action={moveLivestock} submitLabel="Move" resetOnSuccess={false} className="space-y-3">
              <input type="hidden" name="batchId" value={batch.id} />
              <Select name="tankId" defaultValue={batch.tankId} options={tanks.map((t) => ({ value: t.id, label: t.name }))} />
            </ActionForm>
          </Card>

          <Card title="Shopify link">
            <ActionForm action={linkVariant} submitLabel="Save link" resetOnSuccess={false} className="space-y-3">
              <input type="hidden" name="batchId" value={batch.id} />
              <input name="variantId" defaultValue={batch.shopifyVariantId ?? ""} className="input" placeholder="Variant ID (blank to unlink)" />
              <p className="text-xs text-slate-500">
                Online orders for this variant take stock from this batch (oldest batches first).
                {!isAdminConfigured() && " Shopify Admin API isn't configured, so changes here won't push inventory."}
              </p>
            </ActionForm>
          </Card>

          <Card title="Species">
            <p className="font-medium">{batch.species.commonName}</p>
            {batch.species.scientificName && <p className="text-sm text-slate-500 italic">{batch.species.scientificName}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge>{label(batch.species.careLevel)}</Badge>
              <Badge>{label(batch.species.temperament)}</Badge>
              {batch.species.reefSafe !== null && <Badge tone={batch.species.reefSafe ? "green" : "red"}>{batch.species.reefSafe ? "Reef safe" : "Not reef safe"}</Badge>}
            </div>
            {batch.species.notes && <p className="mt-2 text-sm text-slate-600">{batch.species.notes}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
