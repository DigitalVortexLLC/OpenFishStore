// Storefront-facing commerce types. Both the Shopify and demo providers
// return these shapes so the UI never touches raw GraphQL responses.

export type Money = { amount: string; currencyCode: string };

export type Image = { url: string; altText: string | null; width?: number; height?: number };

/** Livestock care details, read from Shopify product metafields (namespace `care`). */
export type CareInfo = {
  waterType?: string;
  careLevel?: string;
  temperament?: string;
  reefSafe?: boolean;
  minTankGallons?: number;
  maxSizeInches?: number;
  diet?: string;
  scientificName?: string;
  /** Live animal: shown with pickup/shipping guarantee messaging. */
  live?: boolean;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: Money;
  selectedOptions: { name: string; value: string }[];
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: Image | null;
  images: Image[];
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  variants: ProductVariant[];
  care: CareInfo;
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: Image | null;
};

export type CartLine = {
  id: string;
  quantity: number;
  cost: { totalAmount: Money };
  merchandise: {
    id: string;
    title: string;
    product: { handle: string; title: string; featuredImage: Image | null; care: CareInfo };
  };
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: Money; totalAmount: Money };
  lines: CartLine[];
};

export type ProductSort = "RELEVANCE" | "BEST_SELLING" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";

export interface CommerceProvider {
  readonly name: "shopify" | "demo";
  getCollections(): Promise<Collection[]>;
  getCollection(handle: string): Promise<{ collection: Collection; products: Product[] } | null>;
  getProducts(opts?: { query?: string; first?: number; sort?: ProductSort }): Promise<Product[]>;
  getProduct(handle: string): Promise<Product | null>;
  getCart(cartId: string): Promise<Cart | null>;
  createCart(): Promise<Cart>;
  addToCart(cartId: string, lines: { merchandiseId: string; quantity: number }[]): Promise<Cart>;
  updateCartLine(cartId: string, lineId: string, quantity: number): Promise<Cart>;
  removeCartLine(cartId: string, lineId: string): Promise<Cart>;
}
