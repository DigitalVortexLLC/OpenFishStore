"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { endSession, startSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/form";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user?.active && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!user || !valid) return { ok: false, message: "Incorrect email or password." };

  await startSession(user);
  // Only allow redirects back into the back office.
  const next = parsed.data.next?.startsWith("/admin") ? parsed.data.next : "/admin";
  redirect(next);
}

export async function logout() {
  await endSession();
  redirect("/login");
}
