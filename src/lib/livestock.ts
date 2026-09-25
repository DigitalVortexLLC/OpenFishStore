import "server-only";

import type { BatchStatus } from "./constants";
import { db } from "./db";
import { sellableDelta, statusAfterQuantityChange } from "./livestock-rules";
import { adjustShopifyInventory } from "./shopify/admin";
import { normalizeVariantId } from "./shopify/ids";
import { allocateFifo, type OrderPayload } from "./shopify/webhooks";

type SyncResult = { synced: boolean; warning?: string };

async function pushToShopify(variantId: string | null, delta: number): Promise<SyncResult> {
  if (!variantId || delta === 0) return { synced: false };
  try {
    return { synced: await adjustShopifyInventory(variantId, delta) };
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
  const { before, after } = await db.$transaction(async (tx) => {
    const before = await tx.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId } });
    const quantity = Math.max(0, before.quantity + input.quantityDelta);
    const after = await tx.livestockBatch.update({
      where: { id: before.id },
      data: { quantity, status: statusAfterQuantityChange(before.status, quantity) },
    });
    await tx.livestockEvent.create({
      data: {
        batchId: before.id,
        type: input.type,
        quantityDelta: quantity - before.quantity,
        note: input.note,
        userId: input.userId,
      },
    });
    return { before, after };
  });
  return pushToShopify(after.shopifyVariantId, sellableDelta(before, after));
}

export async function changeBatchStatus(input: {
  batchId: string;
  status: BatchStatus;
  userId: string;
}): Promise<SyncResult> {
  const before = await db.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId } });
  if (before.status === input.status) return { synced: false };
  const after = await db.livestockBatch.update({
    where: { id: before.id },
    data: {
      status: input.status,
      events: {
        create: { type: "STATUS", note: `${before.status} → ${input.status}`, userId: input.userId },
      },
    },
  });
  return pushToShopify(after.shopifyVariantId, sellableDelta(before, after));
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

export async function linkBatchToVariant(input: { batchId: string; variantId: string | null }) {
  const before = await db.livestockBatch.findUniqueOrThrow({ where: { id: input.batchId } });
  const variantId = normalizeVariantId(input.variantId);
  if (before.shopifyVariantId === variantId) return { synced: false };
  await db.livestockBatch.update({ where: { id: before.id }, data: { shopifyVariantId: variantId } });
  // Move this batch's sellable stock from the old variant to the new one.
  const sellable = sellableDelta({ status: "SOLD_OUT", quantity: 0 }, before);
  const results = await Promise.all([
    pushToShopify(before.shopifyVariantId, -sellable),
    pushToShopify(variantId, sellable),
  ]);
  return results.find((r) => r.warning) ?? { synced: results.some((r) => r.synced) };
}

/**
 * Apply a Shopify order to linked livestock batches (oldest stock first).
 * Shopify already decremented its own inventory, so nothing is pushed back.
 */
export async function applyShopifyOrder(order: OrderPayload): Promise<number> {
  let linesApplied = 0;
  for (const line of order.line_items ?? []) {
    const variantId = normalizeVariantId(line.variant_id);
    if (!variantId || line.quantity <= 0) continue;
    await db.$transaction(async (tx) => {
      const batches = await tx.livestockBatch.findMany({
        where: { shopifyVariantId: variantId, status: "AVAILABLE", quantity: { gt: 0 } },
        orderBy: { receivedAt: "asc" },
      });
      for (const { batchId, take } of allocateFifo(batches, line.quantity)) {
        const batch = batches.find((b) => b.id === batchId)!;
        const quantity = batch.quantity - take;
        await tx.livestockBatch.update({
          where: { id: batchId },
          data: {
            quantity,
            status: statusAfterQuantityChange(batch.status, quantity),
            events: {
              create: {
                type: "SOLD",
                quantityDelta: -take,
                source: "SHOPIFY",
                externalRef: String(order.id),
                note: `Online order ${order.name ?? order.id}`,
              },
            },
          },
        });
        linesApplied++;
      }
    });
  }
  return linesApplied;
}
