import "server-only";

import type {
  Cart,
  CareInfo,
  Collection,
  CommerceProvider,
  Image,
  Product,
  ProductSort,
} from "./types";

// Shopify Storefront API provider.
// https://shopify.dev/docs/api/storefront

type Config = { domain: string; token: string; apiVersion: string };

export class ShopifyError extends Error {}

const CARE_KEYS = [
  "water_type",
  "care_level",
  "temperament",
  "reef_safe",
  "min_tank_gallons",
  "max_size_inches",
  "diet",
  "scientific_name",
  "live",
] as const;

const IMAGE = /* GraphQL */ `
  fragment ImageFields on Image { url altText width height }
`;

const PRODUCT = /* GraphQL */ `
  fragment ProductFields on Product {
    id handle title description descriptionHtml productType tags availableForSale
    featuredImage { ...ImageFields }
    images(first: 10) { nodes { ...ImageFields } }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    variants(first: 50) {
      nodes {
        id title availableForSale quantityAvailable
        price { amount currencyCode }
        selectedOptions { name value }
      }
    }
    metafields(identifiers: [${CARE_KEYS.map((k) => `{namespace: "care", key: "${k}"}`).join(", ")}]) {
      key value
    }
  }
  ${IMAGE}
`;

const CART = /* GraphQL */ `
  fragment CartFields on Cart {
    id checkoutUrl totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 100) {
      nodes {
        id quantity
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id title
            product {
              handle title
              featuredImage { ...ImageFields }
              metafields(identifiers: [{namespace: "care", key: "live"}]) { key value }
            }
          }
        }
      }
    }
  }
  ${IMAGE}
`;

type RawMetafield = { key: string; value: string } | null;
type RawProduct = Omit<Product, "images" | "variants" | "care"> & {
  images: { nodes: Image[] };
  variants: { nodes: Product["variants"] };
  metafields: RawMetafield[];
};
type RawCart = Omit<Cart, "lines"> & {
  lines: {
    nodes: {
      id: string;
      quantity: number;
      cost: Cart["lines"][number]["cost"];
      merchandise: {
        id: string;
        title: string;
        product: { handle: string; title: string; featuredImage: Image | null; metafields: RawMetafield[] };
      };
    }[];
  };
};

export function parseCare(metafields: RawMetafield[] | undefined): CareInfo {
  const m = new Map((metafields ?? []).filter(Boolean).map((f) => [f!.key, f!.value]));
  const num = (k: string) => (m.has(k) ? Number(m.get(k)) : undefined);
  const bool = (k: string) => (m.has(k) ? m.get(k) === "true" : undefined);
  return {
    waterType: m.get("water_type"),
    careLevel: m.get("care_level"),
    temperament: m.get("temperament"),
    reefSafe: bool("reef_safe"),
    minTankGallons: num("min_tank_gallons"),
    maxSizeInches: num("max_size_inches"),
    diet: m.get("diet"),
    scientificName: m.get("scientific_name"),
    live: bool("live"),
  };
}

function toProduct(raw: RawProduct): Product {
  const { metafields, images, variants, ...rest } = raw;
  return { ...rest, images: images.nodes, variants: variants.nodes, care: parseCare(metafields) };
}

function toCart(raw: RawCart): Cart {
  return {
    ...raw,
    lines: raw.lines.nodes.map((line) => {
      const { metafields, ...product } = line.merchandise.product;
      return { ...line, merchandise: { ...line.merchandise, product: { ...product, care: parseCare(metafields) } } };
    }),
  };
}

const SORT_KEYS: Record<ProductSort, { sortKey: string; reverse: boolean }> = {
  RELEVANCE: { sortKey: "RELEVANCE", reverse: false },
  BEST_SELLING: { sortKey: "BEST_SELLING", reverse: false },
  PRICE_ASC: { sortKey: "PRICE", reverse: false },
  PRICE_DESC: { sortKey: "PRICE", reverse: true },
  NEWEST: { sortKey: "CREATED_AT", reverse: true },
};

export function createShopifyProvider(config: Config): CommerceProvider {
  const endpoint = `https://${config.domain}/api/${config.apiVersion}/graphql.json`;

  async function request<T>(
    query: string,
    variables: Record<string, unknown> = {},
    opts: { revalidate?: number | false; tags?: string[] } = {},
  ): Promise<T> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.token,
      },
      body: JSON.stringify({ query, variables }),
      ...(opts.revalidate === false
        ? { cache: "no-store" as const }
        : { next: { revalidate: opts.revalidate ?? 60, tags: opts.tags } }),
    });
    if (!res.ok) throw new ShopifyError(`Shopify responded ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) throw new ShopifyError(body.errors.map((e) => e.message).join("; "));
    return body.data as T;
  }

  type CartMutationResult = { cart: RawCart | null; userErrors: { message: string }[] };
  function unwrapCart(result: CartMutationResult): Cart {
    if (result.userErrors.length) throw new ShopifyError(result.userErrors.map((e) => e.message).join("; "));
    if (!result.cart) throw new ShopifyError("Shopify did not return a cart");
    return toCart(result.cart);
  }

  return {
    name: "shopify",

    async getCollections() {
      const data = await request<{ collections: { nodes: Collection[] } }>(
        `query { collections(first: 50, sortKey: TITLE) { nodes { id handle title description image { ...ImageFields } } } } ${IMAGE}`,
        {},
        { tags: ["collections"] },
      );
      return data.collections.nodes;
    },

    async getCollection(handle) {
      const data = await request<{
        collection: (Collection & { products: { nodes: RawProduct[] } }) | null;
      }>(
        `query($handle: String!) {
          collection(handle: $handle) {
            id handle title description image { ...ImageFields }
            products(first: 100) { nodes { ...ProductFields } }
          }
        } ${PRODUCT}`,
        { handle },
        { tags: ["collections", "products"] },
      );
      if (!data.collection) return null;
      const { products, ...collection } = data.collection;
      return { collection, products: products.nodes.map(toProduct) };
    },

    async getProducts({ query, first = 24, sort = "RELEVANCE" } = {}) {
      const { sortKey, reverse } = SORT_KEYS[sort];
      const data = await request<{ products: { nodes: RawProduct[] } }>(
        `query($query: String, $first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean) {
          products(query: $query, first: $first, sortKey: $sortKey, reverse: $reverse) { nodes { ...ProductFields } }
        } ${PRODUCT}`,
        // RELEVANCE is only valid with a search query.
        { query, first, sortKey: !query && sortKey === "RELEVANCE" ? "BEST_SELLING" : sortKey, reverse },
        { tags: ["products"] },
      );
      return data.products.nodes.map(toProduct);
    },

    async getProduct(handle) {
      const data = await request<{ product: RawProduct | null }>(
        `query($handle: String!) { product(handle: $handle) { ...ProductFields } } ${PRODUCT}`,
        { handle },
        { tags: ["products"] },
      );
      return data.product ? toProduct(data.product) : null;
    },

    async getCart(cartId) {
      const data = await request<{ cart: RawCart | null }>(
        `query($cartId: ID!) { cart(id: $cartId) { ...CartFields } } ${CART}`,
        { cartId },
        { revalidate: false },
      );
      return data.cart ? toCart(data.cart) : null;
    },

    async createCart() {
      const data = await request<{ cartCreate: CartMutationResult }>(
        `mutation { cartCreate { cart { ...CartFields } userErrors { message } } } ${CART}`,
        {},
        { revalidate: false },
      );
      return unwrapCart(data.cartCreate);
    },

    async addToCart(cartId, lines) {
      const data = await request<{ cartLinesAdd: CartMutationResult }>(
        `mutation($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
        } ${CART}`,
        { cartId, lines },
        { revalidate: false },
      );
      return unwrapCart(data.cartLinesAdd);
    },

    async updateCartLine(cartId, lineId, quantity) {
      const data = await request<{ cartLinesUpdate: CartMutationResult }>(
        `mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
        } ${CART}`,
        { cartId, lines: [{ id: lineId, quantity }] },
        { revalidate: false },
      );
      return unwrapCart(data.cartLinesUpdate);
    },

    async removeCartLine(cartId, lineId) {
      const data = await request<{ cartLinesRemove: CartMutationResult }>(
        `mutation($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ...CartFields } userErrors { message } }
        } ${CART}`,
        { cartId, lineIds: [lineId] },
        { revalidate: false },
      );
      return unwrapCart(data.cartLinesRemove);
    },
  };
}
