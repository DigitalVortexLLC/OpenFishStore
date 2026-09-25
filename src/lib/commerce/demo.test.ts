import { describe, expect, it } from "vitest";

import { decodeCartId, demoProvider, encodeCartId } from "./demo";

describe("demo cart", () => {
  it("adds, merges, updates and removes lines", async () => {
    const [product] = await demoProvider.getProducts({ query: "clownfish" });
    const variant = product.variants[0];

    let cart = await demoProvider.createCart();
    expect(cart.totalQuantity).toBe(0);

    cart = await demoProvider.addToCart(cart.id, [{ merchandiseId: variant.id, quantity: 1 }]);
    cart = await demoProvider.addToCart(cart.id, [{ merchandiseId: variant.id, quantity: 2 }]);
    expect(cart.lines).toHaveLength(1);
    expect(cart.totalQuantity).toBe(3);
    expect(cart.cost.totalAmount.amount).toBe((Number(variant.price.amount) * 3).toFixed(2));

    cart = await demoProvider.updateCartLine(cart.id, cart.lines[0].id, 5);
    expect(cart.totalQuantity).toBe(5);

    cart = await demoProvider.removeCartLine(cart.id, cart.lines[0].id);
    expect(cart.lines).toHaveLength(0);
  });

  it("enforces availability and stock limits", async () => {
    const soldOut = await demoProvider.getProduct("german-blue-ram");
    const cart = await demoProvider.createCart();
    await expect(
      demoProvider.addToCart(cart.id, [{ merchandiseId: soldOut!.variants[0].id, quantity: 1 }]),
    ).rejects.toThrow(/sold out/);

    const tang = await demoProvider.getProduct("yellow-tang");
    const variant = tang!.variants[0];
    const withTang = await demoProvider.addToCart(cart.id, [{ merchandiseId: variant.id, quantity: 12 }]);
    await expect(
      demoProvider.addToCart(withTang.id, [{ merchandiseId: variant.id, quantity: 1 }]),
    ).rejects.toThrow(/Only 12/);
    await expect(demoProvider.updateCartLine(withTang.id, variant.id, 13)).rejects.toThrow(/Only 12/);
  });

  it("rejects malformed cart ids", () => {
    expect(decodeCartId("gid://shopify/Cart/abc")).toBeNull();
    expect(decodeCartId("demo:not-json")).toBeNull();
    expect(decodeCartId(encodeCartId([["x", 2]]))).toEqual([["x", 2]]);
  });

  it("filters products by collection and search", async () => {
    const corals = await demoProvider.getCollection("corals");
    expect(corals?.products.every((p) => p.productType === "Coral")).toBe(true);
    expect(await demoProvider.getCollection("nope")).toBeNull();
    expect((await demoProvider.getProducts({ query: "Paracheirodon" }))[0].handle).toBe("neon-tetra");
  });
});
