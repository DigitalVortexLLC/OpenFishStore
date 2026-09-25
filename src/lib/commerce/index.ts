import "server-only";

import { demoProvider } from "./demo";
import { createShopifyProvider } from "./shopify";
import type { CommerceProvider } from "./types";

export * from "./types";

function resolveProvider(): CommerceProvider {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (domain && token) {
    return createShopifyProvider({
      domain,
      token,
      apiVersion: process.env.SHOPIFY_API_VERSION || "2026-07",
    });
  }
  return demoProvider;
}

/** Shopify when configured, otherwise the built-in demo catalog. */
export const commerce: CommerceProvider = resolveProvider();
