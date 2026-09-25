import type { Metadata } from "next";
import Link from "next/link";

import { ProductImage } from "@/components/store/product-image";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

import { updateCartLine } from "../actions";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage(props: PageProps<"/cart">) {
  const [cart, params] = await Promise.all([getCart(), props.searchParams]);
  const lines = cart?.lines ?? [];
  const hasLive = lines.some((l) => l.merchandise.product.care.live);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ocean-950">Your cart</h1>

      {params["demo-checkout"] && (
        <p className="mt-4 rounded-lg border border-ocean-200 bg-ocean-50 p-4 text-sm text-ocean-900">
          Demo mode: in a live store this button goes to Shopify Checkout. Connect Shopify in <code>.env</code>.
        </p>
      )}

      {!lines.length ? (
        <div className="mt-8 rounded-xl bg-slate-50 p-10 text-center">
          <p className="text-slate-600">Your cart is empty.</p>
          <Link href="/" className="btn mt-4">
            Keep shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_18rem]">
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-4 py-4">
                <Link
                  href={`/products/${line.merchandise.product.handle}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200"
                >
                  <ProductImage image={line.merchandise.product.featuredImage} alt={line.merchandise.product.title} sizes="80px" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <Link href={`/products/${line.merchandise.product.handle}`} className="font-medium hover:text-ocean-700">
                    {line.merchandise.product.title}
                  </Link>
                  {line.merchandise.title !== "Default Title" && (
                    <p className="text-sm text-slate-500">{line.merchandise.title}</p>
                  )}
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <form action={updateCartLine} className="flex items-center gap-2">
                      <input type="hidden" name="lineId" value={line.id} />
                      <input
                        name="quantity"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={line.quantity}
                        aria-label="Quantity"
                        className="input w-20 py-1"
                      />
                      <button className="btn-secondary">Update</button>
                    </form>
                    <form action={updateCartLine}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="quantity" value={0} />
                      <button className="text-sm text-slate-500 hover:text-red-700">Remove</button>
                    </form>
                  </div>
                </div>
                <p className="font-medium">
                  {formatMoney(line.cost.totalAmount.amount, line.cost.totalAmount.currencyCode)}
                </p>
              </li>
            ))}
          </ul>

          <aside className="h-fit space-y-4 rounded-xl border border-slate-200 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold">
                {formatMoney(cart!.cost.subtotalAmount.amount, cart!.cost.subtotalAmount.currencyCode)}
              </span>
            </div>
            <p className="text-xs text-slate-500">Taxes and shipping are calculated at checkout.</p>
            {hasLive && (
              <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                Your cart has live animals. Pick in-store pickup or overnight shipping at checkout.
              </p>
            )}
            <a href={cart!.checkoutUrl} className="btn w-full py-3">
              Checkout
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}
