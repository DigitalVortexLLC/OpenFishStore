import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { normalizeVariantId } from "./ids";
import { allocateFifo, verifyShopifyHmac } from "./webhooks";

describe("verifyShopifyHmac", () => {
  const secret = "shhh";
  const body = JSON.stringify({ id: 1 });
  const good = createHmac("sha256", secret).update(body).digest("base64");

  it("accepts a valid signature", () => {
    expect(verifyShopifyHmac(body, good, secret)).toBe(true);
  });

  it("rejects tampered bodies, bad headers and missing secrets", () => {
    expect(verifyShopifyHmac(body + " ", good, secret)).toBe(false);
    expect(verifyShopifyHmac(body, "nope", secret)).toBe(false);
    expect(verifyShopifyHmac(body, null, secret)).toBe(false);
    expect(verifyShopifyHmac(body, good, "")).toBe(false);
  });
});

describe("allocateFifo", () => {
  it("takes from the oldest batches first", () => {
    const batches = [
      { id: "a", quantity: 2 },
      { id: "b", quantity: 0 },
      { id: "c", quantity: 5 },
    ];
    expect(allocateFifo(batches, 4)).toEqual([
      { batchId: "a", take: 2 },
      { batchId: "c", take: 2 },
    ]);
    expect(allocateFifo(batches, 99)).toEqual([
      { batchId: "a", take: 2 },
      { batchId: "c", take: 5 },
    ]);
  });
});

describe("normalizeVariantId", () => {
  it("handles gids and numbers", () => {
    expect(normalizeVariantId("gid://shopify/ProductVariant/42")).toBe("42");
    expect(normalizeVariantId(42)).toBe("42");
    expect(normalizeVariantId("abc")).toBeNull();
    expect(normalizeVariantId(null)).toBeNull();
  });
});
