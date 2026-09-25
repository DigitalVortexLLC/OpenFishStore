import Link from "next/link";
import { notFound } from "next/navigation";

import { TankForm } from "@/components/admin/tank-form";
import { Card, EmptyState, GradeBadge, PageHeader, StatusBadge, Table, Td } from "@/components/admin/ui";
import { WaterTestForm } from "@/components/admin/water-test-form";
import { label, type WaterType } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { evaluateWaterTest, WATER_PARAMETERS, WATER_TARGETS } from "@/lib/water";

export const dynamic = "force-dynamic";

export default async function TankPage(props: PageProps<"/admin/tanks/[id]">) {
  const { id } = await props.params;
  const tank = await db.tank.findUnique({
    where: { id },
    include: {
      waterTests: { orderBy: { testedAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
      batches: { where: { quantity: { gt: 0 } }, include: { species: true }, orderBy: { receivedAt: "desc" } },
    },
  });
  if (!tank) notFound();

  const waterType = tank.waterType as WaterType;
  const params = WATER_PARAMETERS.filter((p) => tank.waterTests.some((t) => t[p.key] !== null));

  return (
    <>
      <PageHeader
        title={tank.name}
        description={`${label(waterType)} · ${label(tank.purpose)} · ${tank.volumeGallons} gal${tank.system ? ` · ${tank.system}` : ""}`}
        actions={<Link href="/admin/tanks" className="btn-secondary">← All tanks</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card title="Log a water test">
            <WaterTestForm tankId={tank.id} waterType={waterType} />
          </Card>

          <Card title="Water test history">
            {!tank.waterTests.length ? (
              <EmptyState>No tests logged yet.</EmptyState>
            ) : (
              <Table head={["When", ...params.map((p) => p.label), "By"]}>
                {tank.waterTests.map((test) => {
                  const results = new Map(evaluateWaterTest(waterType, test).map((r) => [r.key, r]));
                  return (
                    <tr key={test.id}>
                      <Td className="whitespace-nowrap text-slate-600">{formatDateTime(test.testedAt)}</Td>
                      {params.map((p) => {
                        const r = results.get(p.key);
                        return <Td key={p.key}>{r ? <GradeBadge grade={r.grade}>{r.value}</GradeBadge> : "—"}</Td>;
                      })}
                      <Td className="text-slate-500">{test.user?.name ?? "—"}</Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Livestock in this tank">
            {!tank.batches.length ? (
              <EmptyState>Empty tank.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {tank.batches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/livestock/${b.id}`} className="hover:text-ocean-700">
                      <span className="font-medium">{b.quantity}×</span> {b.species.commonName}
                    </Link>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Targets">
            <dl className="space-y-1 text-sm">
              {WATER_PARAMETERS.filter((p) => WATER_TARGETS[waterType][p.key]).map((p) => {
                const t = WATER_TARGETS[waterType][p.key]!;
                return (
                  <div key={p.key} className="flex justify-between">
                    <dt className="text-slate-600">{p.label}</dt>
                    <dd className="font-medium">{t.ok[0]}–{t.ok[1]} {p.unit}</dd>
                  </div>
                );
              })}
            </dl>
          </Card>

          <Card title="Tank details">
            <TankForm tank={tank} />
          </Card>
        </div>
      </div>
    </>
  );
}
