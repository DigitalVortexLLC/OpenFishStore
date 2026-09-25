import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { STORE_NAME } from "@/lib/store-config";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await props.searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-ocean-950 to-ocean-700 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-3xl" aria-hidden>
          🐠
        </p>
        <h1 className="mt-2 text-xl font-bold">{STORE_NAME} back office</h1>
        <p className="mb-6 text-sm text-slate-500">Staff sign in</p>
        <LoginForm next={typeof next === "string" ? next : undefined} />
        <Link href="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-ocean-700">
          ← Back to the store
        </Link>
      </div>
    </div>
  );
}
