import "server-only";

import { cookies } from "next/headers";

import { commerce, type Cart } from "./commerce";
import { shouldUseSecureCookies } from "./cookies";

export const CART_COOKIE = "ofs_cart";

export async function getCart(): Promise<Cart | null> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  if (!cartId) return null;
  try {
    return await commerce.getCart(cartId);
  } catch (err) {
    console.error("Failed to load cart", err);
    return null;
  }
}

export async function saveCartId(cartId: string) {
  (await cookies()).set(CART_COOKIE, cartId, {
    httpOnly: true,
    secure: await shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}
