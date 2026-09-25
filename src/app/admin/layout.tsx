import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/nav";
import { requireUser } from "@/lib/auth";
import { label } from "@/lib/constants";
import { STORE_NAME } from "@/lib/store-config";

import { logout } from "../login/actions";

export const metadata: Metadata = { title: { default: "Back office", template: `%s | ${STORE_NAME} back office` } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <aside className="bg-ocean-950 px-3 py-4 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col">
        <Link href="/admin" className="mb-4 flex items-center gap-2 px-3 font-bold text-white">
          <span aria-hidden>🐠</span> {STORE_NAME}
        </Link>
        <AdminNav isOwner={user.role === "OWNER"} />
        <div className="mt-4 border-t border-ocean-900 px-3 pt-4 text-sm text-ocean-200 md:mt-auto">
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-xs">{label(user.role)}</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="hover:text-white">
              View store
            </Link>
            <form action={logout}>
              <button className="hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
