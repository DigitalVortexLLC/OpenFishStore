import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { Card, EmptyState, Field, PageHeader, StatusBadge, Table, Td } from "@/components/admin/ui";
import { label, SPECIAL_ORDER_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatCents, formatDate } from "@/lib/format";

import { createSpecialOrder, setSpecialOrderStatus } from "../actions";

export const metadata: Metadata = { title: "Special orders" };
export const dynamic = "force-dynamic";

export default async function SpecialOrdersPage() {
  const orders = await db.specialOrder.findMany({ orderBy: [{ createdAt: "desc" }], take: 200 });
  const open = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const closed = orders.filter((o) => ["COMPLETED", "CANCELLED"].includes(o.status));

  return (
    <>
      <PageHeader title="Special orders" description="Customer requests for livestock or products you don't normally stock." />
      <Card title={`Open (${open.length})`}>
        {!open.length ? <EmptyState>No open special orders.</EmptyState> : <OrdersTable orders={open} />}
      </Card>

      <Card title="New special order" className="mt-6">
        <ActionForm action={createSpecialOrder} submitLabel="Create order" className="grid gap-3 sm:grid-cols-3">
          <Field label="Customer name" htmlFor="customerName">
            <input id="customerName" name="customerName" required className="input" />
          </Field>
          <Field label="Email" htmlFor="customerEmail">
            <input id="customerEmail" name="customerEmail" type="email" className="input" />
          </Field>
          <Field label="Phone" htmlFor="customerPhone">
            <input id="customerPhone" name="customerPhone" type="tel" className="input" />
          </Field>
          <Field label="Request" htmlFor="request" className="sm:col-span-2">
            <input id="request" name="request" required className="input" placeholder="e.g. Pair of Mandarin Dragonets, eating frozen" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qty" htmlFor="quantity">
              <input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="input" />
            </Field>
            <Field label="Deposit ($)" htmlFor="deposit">
              <input id="deposit" name="deposit" type="number" step="0.01" min={0} className="input" />
            </Field>
          </div>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-3">
            <input id="notes" name="notes" className="input" />
          </Field>
        </ActionForm>
      </Card>

      {!!closed.length && (
        <Card title="Closed" className="mt-6">
          <OrdersTable orders={closed} />
        </Card>
      )}
    </>
  );
}

function OrdersTable({ orders }: { orders: Awaited<ReturnType<typeof db.specialOrder.findMany>> }) {
  return (
    <Table head={["Customer", "Request", "Deposit", "Created", "Status", ""]}>
      {orders.map((o) => (
        <tr key={o.id}>
          <Td>
            <p className="font-medium">{o.customerName}</p>
            <p className="text-xs text-slate-500">{[o.customerPhone, o.customerEmail].filter(Boolean).join(" · ")}</p>
          </Td>
          <Td>
            {o.quantity}× {o.request}
            {o.notes && <p className="text-xs text-slate-500">{o.notes}</p>}
          </Td>
          <Td>{o.depositCents ? formatCents(o.depositCents) : "—"}</Td>
          <Td className="whitespace-nowrap text-slate-600">{formatDate(o.createdAt)}</Td>
          <Td><StatusBadge status={o.status} /></Td>
          <Td>
            <form action={setSpecialOrderStatus} className="flex gap-2">
              <input type="hidden" name="orderId" value={o.id} />
              <select name="status" defaultValue={o.status} aria-label="Status" className="input w-auto py-1">
                {SPECIAL_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{label(s)}</option>
                ))}
              </select>
              <button className="btn-secondary">Set</button>
            </form>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
