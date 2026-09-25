import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a Shopify webhook: X-Shopify-Hmac-Sha256 is the base64 HMAC-SHA256
 * of the raw request body, keyed with the app's client secret.
 */
export function verifyShopifyHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let received: Buffer;
  try {
    received = Buffer.from(hmacHeader, "base64");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export type OrderLineItem = { variant_id: number | null; quantity: number; title?: string };
export type OrderPayload = { id: number; name?: string; line_items?: OrderLineItem[] };

type BatchStock = { id: string; quantity: number };

/**
 * Split a sold quantity across batches, oldest first (batches must already be
 * sorted). Returns how much to take from each batch; any shortfall is ignored
 * because Shopify, not the back office, decides what can be oversold.
 */
export function allocateFifo(batches: BatchStock[], sold: number): { batchId: string; take: number }[] {
  const allocations: { batchId: string; take: number }[] = [];
  let remaining = sold;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take > 0) {
      allocations.push({ batchId: batch.id, take });
      remaining -= take;
    }
  }
  return allocations;
}
