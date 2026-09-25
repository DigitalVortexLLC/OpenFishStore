import "server-only";

import { headers } from "next/headers";

/**
 * Mark cookies Secure when the request came in over HTTPS (directly or via a
 * proxy), so the app also works when self-hosted over plain HTTP on a LAN.
 */
export async function shouldUseSecureCookies(): Promise<boolean> {
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  return process.env.NODE_ENV === "production";
}
