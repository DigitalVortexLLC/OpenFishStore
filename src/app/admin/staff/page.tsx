import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { Badge, Card, Field, PageHeader, Select, Table, Td } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { label, USER_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

import { createStaff, setStaffActive } from "../actions";

export const metadata: Metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await requireUser("OWNER");
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <>
      <PageHeader title="Staff" description="Who can sign in to the back office." />
      <Card>
        <Table head={["Name", "Email", "Role", "Since", "Status", ""]}>
          {users.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium">{u.name}</Td>
              <Td>{u.email}</Td>
              <Td>{label(u.role)}</Td>
              <Td className="text-slate-600">{formatDate(u.createdAt)}</Td>
              <Td><Badge tone={u.active ? "green" : "gray"}>{u.active ? "Active" : "Inactive"}</Badge></Td>
              <Td>
                {u.id !== me.id && (
                  <form action={setStaffActive}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="active" value={String(!u.active)} />
                    <button className="btn-secondary">{u.active ? "Deactivate" : "Reactivate"}</button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Add staff member" className="mt-6">
        <ActionForm action={createStaff} submitLabel="Add staff" className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="name"><input id="name" name="name" required className="input" /></Field>
          <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" required className="input" /></Field>
          <Field label="Role" htmlFor="role"><Select name="role" options={USER_ROLES} defaultValue="STAFF" /></Field>
          <Field label="Temporary password" htmlFor="password">
            <input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" className="input" />
          </Field>
        </ActionForm>
      </Card>
    </>
  );
}
