import "server-only";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/lib/constants";
import { db } from "@/lib/db";
import { shouldUseSecureCookies } from "@/lib/cookies";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function startSession(user: { id: string; role: string; name: string }) {
  const token = await signSession({ userId: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Current staff user, re-checked against the database once per request. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return user?.active ? user : null;
});

const ROLE_RANK: Record<UserRole, number> = { STAFF: 0, MANAGER: 1, OWNER: 2 };

/** Use at the top of every admin page and server action. */
export async function requireUser(minRole: UserRole = "STAFF") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if ((ROLE_RANK[user.role as UserRole] ?? -1) < ROLE_RANK[minRole]) {
    throw new Error("You do not have permission to do that.");
  }
  return user;
}
