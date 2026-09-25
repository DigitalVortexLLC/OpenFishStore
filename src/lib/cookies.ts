import "server-only";

import { headers } from "next/headers";

/**
 * Whether to mark cookies Secure. COOKIE_SECURE=true/false forces it (use
 * "false" when serving over plain HTTP, e.g. on a LAN). Otherwise it follows
 * the request protocol: Next.js sets x-forwarded-proto on direct requests, and
 * reverse proxies set it for the original client connection.
 */
export async function shouldUseSecureCookies(): Promise<boolean> {
  const forced = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (forced === "true") return true;
  if (forced === "false") return false;
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  return process.env.NODE_ENV === "production";
}
