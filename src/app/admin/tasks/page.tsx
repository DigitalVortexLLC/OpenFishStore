import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { Badge, Card, EmptyState, Field, PageHeader, Select } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

import { completeTask, createTask } from "../actions";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const now = new Date();
  const [open, recent, tanks, staff] = await Promise.all([
    db.maintenanceTask.findMany({
      where: { completedAt: null },
      orderBy: { dueAt: "asc" },
      include: { tank: true, assignee: { select: { name: true } } },
    }),
    db.maintenanceTask.findMany({
      where: { completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 15,
      include: { tank: true, completedBy: { select: { name: true } } },
    }),
    db.tank.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Tasks" description="Water changes, feeding, filter maintenance and anything else on the schedule." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card title={`Open (${open.length})`}>
            {!open.length ? (
              <EmptyState>All caught up.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {open.map((t) => {
                  const overdue = t.dueAt < now;
                  return (
                    <li key={t.id} className="flex items-start gap-3 py-3">
                      <form action={completeTask}>
                        <input type="hidden" name="taskId" value={t.id} />
                        <button
                          aria-label={`Complete ${t.title}`}
                          className="mt-0.5 h-5 w-5 rounded border-2 border-slate-300 transition hover:border-ocean-600 hover:bg-ocean-50"
                        />
                      </form>
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-slate-500">
                          {[t.tank?.name, t.assignee?.name, t.repeatDays && `every ${t.repeatDays} days`].filter(Boolean).join(" · ")}
                        </p>
                        {t.description && <p className="mt-1 text-slate-600">{t.description}</p>}
                      </div>
                      <Badge tone={overdue ? "red" : "gray"}>{overdue ? `Overdue · ${formatDate(t.dueAt)}` : formatDate(t.dueAt)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="Recently completed">
            {!recent.length ? (
              <EmptyState>Nothing completed yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {recent.map((t) => (
                  <li key={t.id} className="flex justify-between py-2 text-slate-600">
                    <span className="line-through">{t.title}{t.tank && ` · ${t.tank.name}`}</span>
                    <span>{t.completedBy?.name} · {formatDateTime(t.completedAt!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="New task" className="h-fit">
          <ActionForm action={createTask} submitLabel="Add task" className="space-y-3">
            <Field label="Title" htmlFor="title">
              <input id="title" name="title" required className="input" placeholder="20% water change" />
            </Field>
            <Field label="Tank" htmlFor="tankId">
              <Select name="tankId" options={[{ value: "", label: "— Any / none —" }, ...tanks.map((t) => ({ value: t.id, label: t.name }))]} />
            </Field>
            <Field label="Assignee" htmlFor="assigneeId">
              <Select name="assigneeId" options={[{ value: "", label: "— Unassigned —" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due" htmlFor="dueAt">
                <input id="dueAt" name="dueAt" type="date" required defaultValue={now.toISOString().slice(0, 10)} className="input" />
              </Field>
              <Field label="Repeat (days)" htmlFor="repeatDays">
                <input id="repeatDays" name="repeatDays" type="number" min={1} className="input" placeholder="Never" />
              </Field>
            </div>
            <Field label="Details" htmlFor="description">
              <textarea id="description" name="description" rows={2} className="input" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
