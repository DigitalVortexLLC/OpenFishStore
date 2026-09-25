import type { Metadata } from "next";
import Link from "next/link";

import { TankForm } from "@/components/admin/tank-form";
import { Badge, Card, EmptyState, GradeBadge, PageHeader } from "@/components/admin/ui";
import { label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { getTanksWithLatestTest } from "@/lib/queries";

export const metadata: Metadata = { title: "Tanks" };
export const dynamic = "force-dynamic";

export default async function TanksPage() {
  const tanks = await getTanksWithLatestTest();
  const systems = Map.groupBy(tanks, (t) => t.system ?? "Standalone tanks");

  return (
    <>
      <PageHeader title="Tanks & water" description="Latest water chemistry for every active tank." />
      {!tanks.length && <EmptyState>No tanks yet. Add your first one below.</EmptyState>}
      <div className="space-y-6">
        {[...systems].map(([system, list]) => (
          <section key={system}>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">{system}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/tanks/${t.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-ocean-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {label(t.waterType)} · {label(t.purpose)} · {t.volumeGallons} gal
                      </p>
                    </div>
                    {t.grade ? <GradeBadge grade={t.grade} /> : <Badge>No tests</Badge>}
                  </div>
                  {t.latest && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {t.results.map((r) => (
                        <GradeBadge key={r.key} grade={r.grade}>
                          {r.label} {r.value}
                        </GradeBadge>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    {t.animalCount} animals
                    {t.latest && ` · tested ${formatDateTime(t.latest.testedAt)}`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Card title="Add a tank" className="mt-8">
        <TankForm />
      </Card>
    </>
  );
}
