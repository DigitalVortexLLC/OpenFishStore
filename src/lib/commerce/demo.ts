import { DEMO_COLLECTIONS, DEMO_PRODUCTS } from "./demo-data";
import type { Cart, CommerceProvider, Product, ProductSort } from "./types";

// In-memory demo provider. The cart is stateless: its contents are encoded
// in the cart id itself, which the storefront keeps in a cookie.

type Lines = [variantId: string, quantity: number][];

const PREFIX = "demo:";

export function encodeCartId(lines: Lines): string {
  return PREFIX + Buffer.from(JSON.stringify(lines)).toString("base64url");
}

export function decodeCartId(cartId: string): Lines | null {
  if (!cartId.startsWith(PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cartId.slice(PREFIX.length), "base64url").toString());
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (l): l is Lines[number] =>
        Array.isArray(l) && typeof l[0] === "string" && Number.isInteger(l[1]) && l[1] > 0,
    );
  } catch {
    return null;
  }
}

function findVariant(variantId: string) {
  for (const product of DEMO_PRODUCTS) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

function buildCart(lines: Lines): Cart {
  const cartLines = lines.flatMap(([variantId, quantity]) => {
    const found = findVariant(variantId);
    if (!found) return [];
    const { product, variant } = found;
    return [
      {
        id: variantId,
        quantity,
        cost: {
          totalAmount: { amount: (Number(variant.price.amount) * quantity).toFixed(2), currencyCode: "USD" },
        },
        merchandise: {
          id: variant.id,
          title: variant.title,
          product: { handle: product.handle, title: product.title, featuredImage: null, care: product.care },
        },
      },
    ];
  });
  const subtotal = cartLines.reduce((sum, l) => sum + Number(l.cost.totalAmount.amount), 0);
  const total = { amount: subtotal.toFixed(2), currencyCode: "USD" };
  return {
    id: encodeCartId(cartLines.map((l) => [l.merchandise.id, l.quantity])),
    // Demo mode has no real checkout; send shoppers to an explanatory page.
    checkoutUrl: "/cart?demo-checkout=1",
    totalQuantity: cartLines.reduce((sum, l) => sum + l.quantity, 0),
    cost: { subtotalAmount: total, totalAmount: total },
    lines: cartLines,
  };
}

function strip(demo: (typeof DEMO_PRODUCTS)[number]): Product {
  const product: Product & { collections?: string[] } = { ...demo };
  delete product.collections;
  return product;
}

function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const price = (p: Product) => Number(p.priceRange.minVariantPrice.amount);
  const sorted = [...products];
  if (sort === "PRICE_ASC") sorted.sort((a, b) => price(a) - price(b));
  if (sort === "PRICE_DESC") sorted.sort((a, b) => price(b) - price(a));
  if (sort === "NEWEST") sorted.reverse();
  return sorted;
}

export const demoProvider: CommerceProvider = {
  name: "demo",

  async getCollections() {
    return DEMO_COLLECTIONS;
  },

  async getCollection(handle) {
    const collection = DEMO_COLLECTIONS.find((c) => c.handle === handle);
    if (!collection) return null;
    return { collection, products: DEMO_PRODUCTS.filter((p) => p.collections.includes(handle)).map(strip) };
  },

  async getProducts({ query, first = 24, sort = "RELEVANCE" } = {}) {
    const q = query?.trim().toLowerCase();
    const matches = DEMO_PRODUCTS.filter(
      (p) =>
        !q ||
        [p.title, p.description, p.productType, p.care.scientificName ?? "", ...p.tags]
          .join(" ")
          .toLowerCase()
          .includes(q),
    ).map(strip);
    return sortProducts(matches, sort).slice(0, first);
  },

  async getProduct(handle) {
    const product = DEMO_PRODUCTS.find((p) => p.handle === handle);
    return product ? strip(product) : null;
  },

  async getCart(cartId) {
    const lines = decodeCartId(cartId);
    return lines ? buildCart(lines) : null;
  },

  async createCart() {
    return buildCart([]);
  },

  async addToCart(cartId, add) {
    const lines = decodeCartId(cartId) ?? [];
    for (const { merchandiseId, quantity } of add) {
      const existing = lines.find((l) => l[0] === merchandiseId);
      if (existing) existing[1] += quantity;
      else lines.push([merchandiseId, quantity]);
    }
    return buildCart(lines);
  },

  async updateCartLine(cartId, lineId, quantity) {
    const lines = (decodeCartId(cartId) ?? [])
      .map(([id, q]): Lines[number] => [id, id === lineId ? quantity : q])
      .filter(([, q]) => q > 0);
    return buildCart(lines);
  },

  async removeCartLine(cartId, lineId) {
    return buildCart((decodeCartId(cartId) ?? []).filter(([id]) => id !== lineId));
  },
};
