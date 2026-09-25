import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/admin/action-form";
import { Card, EmptyState, Field, PageHeader, Select, StatusBadge, Table, Td } from "@/components/admin/ui";
import { BATCH_STATUSES, label } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

import { receiveLivestock } from "../actions";

export const metadata: Metadata = { title: "Livestock" };
export const dynamic = "force-dynamic";

export default async function LivestockPage(props: PageProps<"/admin/livestock">) {
  const { status: rawStatus, q: rawQ } = await props.searchParams;
  const status = BATCH_STATUSES.find((s) => s === rawStatus);
  const q = typeof rawQ === "string" ? rawQ.trim() : "";

  const [batches, species, tanks] = await Promise.all([
    db.livestockBatch.findMany({
      where: {
        ...(status ? { status } : { status: { not: "SOLD_OUT" } }),
        ...(q && {
          OR: [{ species: { commonName: { contains: q } } }, { species: { scientificName: { contains: q } } }, { supplier: { contains: q } }],
        }),
      },
      include: { species: true, tank: true },
      orderBy: { receivedAt: "desc" },
      take: 200,
    }),
    db.species.findMany({ orderBy: { commonName: "asc" }, select: { id: true, commonName: true } }),
    db.tank.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, purpose: true } }),
  ]);

  const tabs = [{ value: undefined, label: "In stock" }, ...BATCH_STATUSES.map((s) => ({ value: s, label: label(s) }))];

  return (
    <>
      <PageHeader title="Livestock" description="Every batch of animals, where it lives and how many are left." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/admin/livestock?status=${t.value}` : "/admin/livestock"}
            className={`rounded-full px-3 py-1 text-sm ${status === t.value ? "bg-ocean-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
          >
            {t.label}
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} type="search" placeholder="Search species or supplier" className="input w-64" />
        </form>
      </div>

      <Card>
        {!batches.length ? (
          <EmptyState>No batches match.</EmptyState>
        ) : (
          <Table head={["Species", "Qty", "Tank", "Status", "Received", "Supplier", "Shopify"]}>
            {batches.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/admin/livestock/${b.id}`} className="font-medium text-ocean-800 hover:underline">
                    {b.species.commonName}
                  </Link>
                  {b.species.scientificName && <p className="text-xs text-slate-500 italic">{b.species.scientificName}</p>}
                </Td>
                <Td className="font-semibold">
                  {b.quantity}
                  <span className="font-normal text-slate-400"> / {b.receivedQuantity}</span>
                </Td>
                <Td>{b.tank.name}</Td>
                <Td><StatusBadge status={b.status} /></Td>
                <Td className="whitespace-nowrap text-slate-600">{formatDate(b.receivedAt)}</Td>
                <Td className="text-slate-600">{b.supplier ?? "—"}</Td>
                <Td className="text-slate-600">{b.shopifyVariantId ? "Linked" : "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Receive livestock" className="mt-6">
        {!species.length || !tanks.length ? (
          <EmptyState>
            Add at least one <Link href="/admin/species" className="text-ocean-700 underline">species</Link> and one{" "}
            <Link href="/admin/tanks" className="text-ocean-700 underline">tank</Link> first.
          </EmptyState>
        ) : (
          <ActionForm action={receiveLivestock} submitLabel="Receive batch" className="grid gap-3 sm:grid-cols-3">
            <Field label="Species" htmlFor="speciesId">
              <Select name="speciesId" options={species.map((s) => ({ value: s.id, label: s.commonName }))} />
            </Field>
            <Field label="Tank" htmlFor="tankId">
              <Select
                name="tankId"
                defaultValue={tanks.find((t) => t.purpose === "QUARANTINE")?.id}
                options={tanks.map((t) => ({ value: t.id, label: `${t.name} (${label(t.purpose)})` }))}
              />
            </Field>
            <Field label="Quantity" htmlFor="quantity">
              <input id="quantity" name="quantity" type="number" min={1} required className="input" />
            </Field>
            <Field label="Unit cost ($)" htmlFor="unitCost">
              <input id="unitCost" name="unitCost" type="number" step="0.01" min="0" className="input" />
            </Field>
            <Field label="Supplier" htmlFor="supplier">
              <input id="supplier" name="supplier" className="input" />
            </Field>
            <Field label="Quarantine (days)" htmlFor="quarantineDays">
              <input id="quarantineDays" name="quarantineDays" type="number" min={0} defaultValue={14} className="input" />
            </Field>
            <Field label="Shopify variant ID (optional)" htmlFor="shopifyVariantId" className="sm:col-span-2">
              <input id="shopifyVariantId" name="shopifyVariantId" className="input" placeholder="gid://shopify/ProductVariant/… or numeric id" />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <input id="notes" name="notes" className="input" />
            </Field>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
