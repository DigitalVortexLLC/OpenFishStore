import "server-only";

import type { LivestockBatch, Prisma } from "@prisma/client";

import type { BatchStatus } from "./constants";
import { db } from "./db";
import { sellableDelta, statusAfterQuantityChange } from "./livestock-rules";
import { adjustShopifyInventory } from "./shopify/admin";
import { normalizeVariantId } from "./shopify/ids";
import { allocateFifo, type OrderPayload } from "./shopify/webhooks";

type SyncResult = { synced: boolean; warning?: string };
type Tx = Prisma.TransactionClient;

/** A conditional write lost a race with another writer; the operation is retried. */
class StaleWriteError extends Error {}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof StaleWriteError) || attempt >= attempts) throw err;
    }
  }
}

/**
 * Update a batch only if it still has the quantity, status and Shopify link we
 * read, so concurrent writers can't overwrite each other's changes.
 */
async function updateBatchIfUnchanged(tx: Tx, before: LivestockBatch, data: Prisma.LivestockBatchUpdateManyMutationInput) {
  const { count } = await tx.livestockBatch.updateMany({
    where: {
      id: before.id,
      quantity: before.quantity,
      status: before.status,
      shopifyVariantId: before.shopifyVariantId,
    },
    data,
  });
  if (count !== 1) throw new StaleWriteError(`Batch ${before.id} changed concurrently`);
}

/**
 * Push a sellable-stock change to Shopify. `key` identifies the back-office
 * operation (its event id) so a replay of it can't apply the delta twice.
 */
async function pushToShopify(variantId: string | null, delta: number, key: string): Promise<SyncResult> {
  if (!variantId || delta === 0) return { synced: false };
  try {
    return { synced: await adjustShopifyInventory(variantId, delta, key) };
  } catch (err) {
    console.error("Shopify inventory sync failed", err);
    return { synced: false, warning: `Saved, but Shopify sync failed: ${(err as Error).message}` };
  }
}

/** Record a staff count change (sale, loss, recount) and mirror it to Shopify. */
export async function recordQuantityChange(input: {
  batchId: string;
  type: string;
  quantityDelta: number;
  note?: string | null;
  userId: string;
}): Promise<SyncResult> {
  const { before, after, eventId } = await withRetry(() =>
    db.$transaction(async (tx) => {
      const before = await tx.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId } });
      const quantity = Math.max(0, before.quantity + input.quantityDelta);
      const after = { ...before, quantity, status: statusAfterQuantityChange(before.status, quantity) };
      await updateBatchIfUnchanged(tx, before, { quantity: after.quantity, status: after.status });
      const event = await tx.livestockEvent.create({
        data: {
          batchId: before.id,
          type: input.type,
          quantityDelta: quantity - before.quantity,
          note: input.note,
          userId: input.userId,
        },
      });
      return { before, after, eventId: event.id };
    }),
  );
  return pushToShopify(after.shopifyVariantId, sellableDelta(before, after), eventId);
}

export async function changeBatchStatus(input: {
  batchId: string;
  status: BatchStatus;
  userId: string;
}): Promise<SyncResult> {
  const change = await withRetry(() =>
    db.$transaction(async (tx) => {
      const before = await tx.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId } });
      if (before.status === input.status) return null;
      await updateBatchIfUnchanged(tx, before, { status: input.status });
      const event = await tx.livestockEvent.create({
        data: { batchId: before.id, type: "STATUS", note: `${before.status} → ${input.status}`, userId: input.userId },
      });
      return { before, after: { ...before, status: input.status }, eventId: event.id };
    }),
  );
  if (!change) return { synced: false };
  return pushToShopify(change.after.shopifyVariantId, sellableDelta(change.before, change.after), change.eventId);
}

export async function moveBatch(input: { batchId: string; tankId: string; userId: string }) {
  const [batch, tank] = await Promise.all([
    db.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId }, include: { tank: true } }),
    db.tank.findUniqueOrThrow({ where: { id: input.tankId } }),
  ]);
  if (batch.tankId === tank.id) return;
  await db.livestockBatch.update({
    where: { id: batch.id },
    data: {
      tankId: tank.id,
      events: { create: { type: "MOVED", note: `${batch.tank.name} → ${tank.name}`, userId: input.userId } },
    },
  });
}

export async function linkBatchToVariant(input: { batchId: string; variantId: string | null; userId?: string }) {
  const variantId = normalizeVariantId(input.variantId);
  const change = await withRetry(() =>
    db.$transaction(async (tx) => {
      const before = await tx.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId } });
      if (before.shopifyVariantId === variantId) return null;
      await updateBatchIfUnchanged(tx, before, { shopifyVariantId: variantId });
      const event = await tx.livestockEvent.create({
        data: {
          batchId: before.id,
          type: "LINKED",
          note: `Shopify variant ${before.shopifyVariantId ?? "none"} → ${variantId ?? "none"}`,
          userId: input.userId,
        },
      });
      return { before, eventId: event.id };
    }),
  );
  if (!change) return { synced: false };
  // Move this batch's sellable stock from the old variant to the new one.
  const sellable = sellableDelta({ status: "SOLD_OUT", quantity: 0 }, change.before);
  const results = await Promise.all([
    pushToShopify(change.before.shopifyVariantId, -sellable, `${change.eventId}:from`),
    pushToShopify(variantId, sellable, `${change.eventId}:to`),
  ]);
  return results.find((r) => r.warning) ?? { synced: results.some((r) => r.synced) };
}

/**
 * Apply a Shopify order to linked livestock batches (oldest stock first) and
 * record the webhook delivery, all in one transaction: either the whole order
 * is applied and the delivery marked processed, or nothing is and Shopify's
 * retry can try again. Returns null when the delivery was already processed.
 * Shopify already decremented its own inventory, so nothing is pushed back.
 */
export async function applyShopifyOrder(
  order: OrderPayload,
  delivery: { webhookId: string; topic: string },
): Promise<number | null> {
  return withRetry(() =>
    db.$transaction(async (tx) => {
      if (await tx.shopifyWebhook.findUnique({ where: { id: delivery.webhookId } })) return null;
      // A concurrent duplicate delivery fails here with a unique violation and rolls back.
      await tx.shopifyWebhook.create({ data: { id: delivery.webhookId, topic: delivery.topic } });

      let linesApplied = 0;
      for (const line of order.line_items ?? []) {
        const variantId = normalizeVariantId(line.variant_id);
        if (!variantId || line.quantity <= 0) continue;
        const batches = await tx.livestockBatch.findMany({
          where: { shopifyVariantId: variantId, status: "AVAILABLE", quantity: { gt: 0 } },
          orderBy: { receivedAt: "asc" },
        });
        for (const { batchId, take } of allocateFifo(batches, line.quantity)) {
          const batch = batches.find((b) => b.id === batchId)!;
          const quantity = batch.quantity - take;
          await updateBatchIfUnchanged(tx, batch, {
            quantity,
            status: statusAfterQuantityChange(batch.status, quantity),
          });
          await tx.livestockEvent.create({
            data: {
              batchId,
              type: "SOLD",
              quantityDelta: -take,
              source: "SHOPIFY",
              externalRef: String(order.id),
              note: `Online order ${order.name ?? order.id}`,
            },
          });
          linesApplied++;
        }
      }
      return linesApplied;
    }),
  );
}
