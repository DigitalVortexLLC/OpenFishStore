import "server-only";

import { variantGid } from "./ids";

// Minimal Shopify Admin API client used to push livestock count changes made
// in the back office (losses, in-store sales, new arrivals) to Shopify.
// https://shopify.dev/docs/api/admin-graphql

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && process.env.SHOPIFY_LOCATION_ID,
  );
}

async function adminRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const version = process.env.SHOPIFY_API_VERSION || "2026-07";
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify Admin API responded ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data as T;
}

type Adjusted = {
  inventoryAdjustQuantities: { userErrors: { code: string | null; message: string }[] };
};

/**
 * Adjust the "available" quantity of a variant at the configured location.
 * Uses changeFromQuantity for optimistic concurrency and retries once if the
 * quantity moved underneath us. `idempotencyKey` must identify the back-office
 * operation (e.g. its event id) so replaying it never applies the delta twice.
 * Returns false when Shopify isn't configured.
 */
export async function adjustShopifyInventory(
  variantId: string,
  delta: number,
  idempotencyKey: string,
  reason = "correction",
) {
  if (!isAdminConfigured() || delta === 0) return false;
  const locationId = process.env.SHOPIFY_LOCATION_ID!;

  for (let attempt = 0; attempt < 2; attempt++) {
    const lookup = await adminRequest<{
      productVariant: {
        inventoryItem: { id: string; inventoryLevel: { quantities: { quantity: number }[] } | null };
      } | null;
    }>(
      `query($id: ID!, $locationId: ID!) {
        productVariant(id: $id) {
          inventoryItem {
            id
            inventoryLevel(locationId: $locationId) { quantities(names: ["available"]) { quantity } }
          }
        }
      }`,
      { id: variantGid(variantId), locationId },
    );
    const item = lookup.productVariant?.inventoryItem;
    if (!item) throw new Error(`Shopify variant ${variantId} not found`);
    const current = item.inventoryLevel?.quantities[0]?.quantity ?? 0;

    const result = await adminRequest<Adjusted>(
      `mutation($input: InventoryAdjustQuantitiesInput!, $key: String!) {
        inventoryAdjustQuantities(input: $input) @idempotent(key: $key) {
          userErrors { code message }
        }
      }`,
      {
        // Each concurrency retry sends a different changeFromQuantity, so it gets its own key.
        key: `ofs:${idempotencyKey}:${attempt}`,
        input: {
          name: "available",
          reason,
          changes: [{ inventoryItemId: item.id, locationId, delta, changeFromQuantity: current }],
        },
      },
    );
    const errors = result.inventoryAdjustQuantities.userErrors;
    if (!errors.length) return true;
    const concurrency = errors.some((e) => e.code?.includes("CONCURRENCY") || /changed/i.test(e.message));
    if (!concurrency || attempt === 1) throw new Error(errors.map((e) => e.message).join("; "));
  }
  return false;
}
