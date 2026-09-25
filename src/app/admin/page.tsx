import Link from "next/link";

import { Badge, Card, EmptyState, GradeBadge, PageHeader, Stat, StatusBadge } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { daysBetween, formatDate } from "@/lib/format";
import { getTanksWithLatestTest } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STALE_TEST_DAYS = 3;

export default async function DashboardPage() {
  const now = new Date();
  const [tanks, tasksDue, quarantine, openOrders, recentLosses] = await Promise.all([
    getTanksWithLatestTest(),
    db.maintenanceTask.findMany({
      where: { completedAt: null, dueAt: { lte: new Date(now.getTime() + 86_400_000) } },
      orderBy: { dueAt: "asc" },
      include: { tank: true },
      take: 8,
    }),
    db.livestockBatch.findMany({
      where: { status: "QUARANTINE", quantity: { gt: 0 } },
      orderBy: { quarantineUntil: "asc" },
      include: { species: true, tank: true },
    }),
    db.specialOrder.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    db.livestockEvent.aggregate({
      where: { type: "LOSS", createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
      _sum: { quantityDelta: true },
    }),
  ]);

  const alerts = tanks.filter((t) => t.grade === "critical" || t.grade === "warn");
  const stale = tanks.filter((t) => !t.latest || daysBetween(t.latest.testedAt, now) >= STALE_TEST_DAYS);
  const overdue = tasksDue.filter((t) => t.dueAt < now);
  const readyToSell = quarantine.filter((b) => b.quarantineUntil && b.quarantineUntil <= now);

  return (
    <>
      <PageHeader title="Dashboard" description={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tank alerts" value={alerts.length} tone={alerts.some((a) => a.grade === "critical") ? "red" : alerts.length ? "yellow" : undefined} hint={`${tanks.length} active tanks`} />
        <Stat label="Tasks overdue" value={overdue.length} tone={overdue.length ? "red" : undefined} hint={`${tasksDue.length} due by tomorrow`} />
        <Stat label="In quarantine" value={quarantine.reduce((s, b) => s + b.quantity, 0)} hint={`${readyToSell.length} batches ready to release`} />
        <Stat label="Losses (7 days)" value={Math.abs(recentLosses._sum.quantityDelta ?? 0)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Water quality" actions={<Link href="/admin/tanks" className="text-sm text-ocean-700 hover:underline">All tanks</Link>}>
          {!alerts.length && !stale.length ? (
            <EmptyState>All tanks tested recently and in range. 🎉</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/tanks/${t.id}`} className="font-medium hover:text-ocean-700">{t.name}</Link>
                  <span className="flex flex-wrap justify-end gap-1">
                    {t.results.filter((r) => r.grade !== "ok").map((r) => (
                      <GradeBadge key={r.key} grade={r.grade}>{r.label} {r.value}</GradeBadge>
                    ))}
                  </span>
                </li>
              ))}
              {stale.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/tanks/${t.id}`} className="font-medium hover:text-ocean-700">{t.name}</Link>
                  <Badge>{t.latest ? `Last tested ${formatDate(t.latest.testedAt)}` : "Never tested"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tasks due" actions={<Link href="/admin/tasks" className="text-sm text-ocean-700 hover:underline">All tasks</Link>}>
          {!tasksDue.length ? (
            <EmptyState>Nothing due. Nice work.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasksDue.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{t.title}</span>
                    {t.tank && <span className="text-slate-500"> · {t.tank.name}</span>}
                  </span>
                  <Badge tone={t.dueAt < now ? "red" : "yellow"}>{t.dueAt < now ? "Overdue" : "Due soon"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Quarantine" actions={<Link href="/admin/livestock?status=QUARANTINE" className="text-sm text-ocean-700 hover:underline">View</Link>}>
          {!quarantine.length ? (
            <EmptyState>No livestock in quarantine.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {quarantine.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/livestock/${b.id}`} className="hover:text-ocean-700">
                    <span className="font-medium">{b.quantity}× {b.species.commonName}</span>
                    <span className="text-slate-500"> · {b.tank.name}</span>
                  </Link>
                  {b.quarantineUntil && (
                    <Badge tone={b.quarantineUntil <= now ? "green" : "gray"}>
                      {b.quarantineUntil <= now ? "Ready to release" : `Until ${formatDate(b.quarantineUntil)}`}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Open special orders" actions={<Link href="/admin/special-orders" className="text-sm text-ocean-700 hover:underline">All orders</Link>}>
          {!openOrders.length ? (
            <EmptyState>No open special orders.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{o.customerName}</span>
                    <span className="text-slate-500"> · {o.quantity}× {o.request}</span>
                  </span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
