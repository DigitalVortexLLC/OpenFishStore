import Link from "next/link";

import { getCart } from "@/lib/cart";
import { commerce } from "@/lib/commerce";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-config";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [collections, cart] = await Promise.all([commerce.getCollections().catch(() => []), getCart()]);

  return (
    <>
      {commerce.name === "demo" && (
        <div className="bg-ocean-950 px-4 py-1.5 text-center text-xs text-ocean-100">
          Demo mode: showing sample products. Add your Shopify credentials to <code>.env</code> to go live.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ocean-900">
            <span aria-hidden>🐠</span> {STORE_NAME}
          </Link>
          <nav className="hidden flex-1 gap-5 text-sm text-slate-600 lg:flex">
            {collections.slice(0, 6).map((c) => (
              <Link key={c.handle} href={`/collections/${c.handle}`} className="hover:text-ocean-700">
                {c.title}
              </Link>
            ))}
          </nav>
          <form action="/search" className="ml-auto hidden sm:block lg:ml-0">
            <input
              name="q"
              type="search"
              placeholder="Search fish, corals, gear…"
              aria-label="Search products"
              className="input w-56"
            />
          </form>
          <Link
            href="/cart"
            className="relative ml-auto rounded-full p-2 text-slate-700 hover:bg-slate-100 sm:ml-0"
            aria-label={`Cart, ${cart?.totalQuantity ?? 0} items`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1.3" />
              <circle cx="17" cy="20" r="1.3" />
            </svg>
            {!!cart?.totalQuantity && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-xs font-semibold text-white">
                {cart.totalQuantity}
              </span>
            )}
          </Link>
        </div>
        <nav className="flex gap-4 overflow-x-auto px-4 pb-2 text-sm text-slate-600 lg:hidden">
          {collections.slice(0, 6).map((c) => (
            <Link key={c.handle} href={`/collections/${c.handle}`} className="shrink-0 hover:text-ocean-700">
              {c.title}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-ocean-950 text-ocean-100">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div>
            <p className="text-base font-semibold text-white">{STORE_NAME}</p>
            <p className="mt-2 text-ocean-200">{STORE_TAGLINE}</p>
          </div>
          <div>
            <p className="font-semibold text-white">Shop</p>
            <ul className="mt-2 space-y-1">
              {collections.slice(0, 4).map((c) => (
                <li key={c.handle}>
                  <Link href={`/collections/${c.handle}`} className="hover:text-white">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Store</p>
            <ul className="mt-2 space-y-1">
              <li>Live-arrival guarantee on shipped livestock</li>
              <li>Free water testing in store</li>
              <li>
                <Link href="/admin" className="hover:text-white">
                  Staff login
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
