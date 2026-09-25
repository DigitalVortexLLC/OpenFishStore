import Link from "next/link";

import { ProductGrid } from "@/components/store/product-card";
import { commerce } from "@/lib/commerce";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-config";

export default async function HomePage() {
  const [collections, products] = await Promise.all([
    commerce.getCollections(),
    commerce.getProducts({ first: 8, sort: "BEST_SELLING" }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-700 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <p className="text-sm font-medium tracking-widest text-ocean-200 uppercase">{STORE_NAME}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">{STORE_TAGLINE}</h1>
          <p className="mt-4 max-w-xl text-lg text-ocean-100">
            Quarantined livestock, aquacultured corals and expert advice, from our tanks to yours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/collections/${collections[0]?.handle ?? ""}`} className="btn bg-coral-500 px-6 py-3 hover:bg-coral-600">
              Shop livestock
            </Link>
            <Link href="/search" className="btn bg-white/10 px-6 py-3 hover:bg-white/20">
              Browse everything
            </Link>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-10 bottom-0 hidden text-[14rem] leading-none opacity-20 md:block">
          🐠
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-semibold">Shop by category</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {collections.map((c) => (
            <Link
              key={c.handle}
              href={`/collections/${c.handle}`}
              className="rounded-xl border border-slate-200 bg-sand-50 p-4 transition hover:border-ocean-500 hover:bg-ocean-50"
            >
              <p className="font-medium text-ocean-900">{c.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Popular right now</h2>
          <Link href="/search" className="text-sm font-medium text-ocean-700 hover:underline">
            View all →
          </Link>
        </div>
        <ProductGrid products={products} />
      </section>
    </>
  );
}
