"use client";

import { useActionState, useState } from "react";

import { addToCart, type CartActionState } from "@/app/(store)/actions";
import type { ProductVariant } from "@/lib/commerce/types";
import { formatMoney } from "@/lib/format";

export function AddToCart({ variants }: { variants: ProductVariant[] }) {
  const firstAvailable = variants.find((v) => v.availableForSale) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [state, action, pending] = useActionState<CartActionState, FormData>(addToCart, null);
  const variant = variants.find((v) => v.id === variantId) ?? firstAvailable;
  const showOptions = variants.length > 1 || variant?.title !== "Default Title";

  if (!variant) return null;

  return (
    <form action={action} className="space-y-4">
      <p className="text-2xl font-semibold">{formatMoney(variant.price.amount, variant.price.currencyCode)}</p>

      {showOptions && (
        <fieldset>
          <legend className="field-label">Option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 ${
                  v.id === variantId
                    ? "border-ocean-700 bg-ocean-700 text-white"
                    : "border-slate-300 hover:border-ocean-500"
                }`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  disabled={!v.availableForSale}
                  onChange={() => setVariantId(v.id)}
                  className="sr-only"
                />
                {v.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <input type="hidden" name="merchandiseId" value={variant.id} />
      <div className="flex items-end gap-3">
        <div className="w-24">
          <label htmlFor="quantity" className="field-label">
            Qty
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={variant.quantityAvailable ?? 99}
            defaultValue={1}
            className="input"
          />
        </div>
        <button type="submit" className="btn flex-1 py-2.5" disabled={pending || !variant.availableForSale}>
          {!variant.availableForSale ? "Sold out" : pending ? "Adding…" : "Add to cart"}
        </button>
      </div>
      {state?.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
