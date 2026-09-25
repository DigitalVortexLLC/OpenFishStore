/** "gid://shopify/ProductVariant/123" or 123 -> "123" (the form webhooks use). */
export function normalizeVariantId(id: string | number | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  const match = String(id).trim().match(/(\d+)$/);
  return match ? match[1] : null;
}

export function variantGid(id: string): string {
  return `gid://shopify/ProductVariant/${normalizeVariantId(id)}`;
}
