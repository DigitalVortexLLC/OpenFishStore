"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCart, saveCartId } from "@/lib/cart";
import { commerce } from "@/lib/commerce";

export type CartActionState = { ok: boolean; message?: string } | null;

const addSchema = z.object({
  merchandiseId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Choose an option and quantity." };
  try {
    const cart = (await getCart()) ?? (await commerce.createCart());
    const updated = await commerce.addToCart(cart.id, [parsed.data]);
    await saveCartId(updated.id);
    revalidatePath("/", "layout");
    return { ok: true, message: "Added to cart" };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error && /sold out|available/i.test(err.message) ? err.message : null;
    return { ok: false, message: message ?? "Could not add to cart. Please try again." };
  }
}

const updateSchema = z.object({
  lineId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function updateCartLine(formData: FormData) {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  const cart = await getCart();
  if (!parsed.success || !cart) return;
  const { lineId, quantity } = parsed.data;
  try {
    const updated =
      quantity === 0
        ? await commerce.removeCartLine(cart.id, lineId)
        : await commerce.updateCartLine(cart.id, lineId, quantity);
    await saveCartId(updated.id);
  } catch (err) {
    // e.g. more than the available stock; keep the cart unchanged.
    console.error(err);
  }
  revalidatePath("/", "layout");
}
