import type { BatchStatus } from "./constants";

// Only AVAILABLE batches are sellable online. Shopify's available count for a
// linked variant should equal the sum of its AVAILABLE batch quantities.

type BatchState = { status: string; quantity: number };

export function sellableQuantity(batch: BatchState): number {
  return batch.status === "AVAILABLE" ? Math.max(0, batch.quantity) : 0;
}

/** How much a change to a batch moves the online-sellable stock. */
export function sellableDelta(before: BatchState, after: BatchState): number {
  return sellableQuantity(after) - sellableQuantity(before);
}

/** Status after a quantity change: empty batches sell out, restocked ones reopen. */
export function statusAfterQuantityChange(status: string, quantity: number): BatchStatus {
  if (quantity <= 0) return "SOLD_OUT";
  if (status === "SOLD_OUT") return "AVAILABLE";
  return status as BatchStatus;
}
