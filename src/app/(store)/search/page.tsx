import type { Metadata } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/store/product-card";
import { commerce, type ProductSort } from "@/lib/commerce";

export const metadata: Metadata = { title: "Search" };

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "RELEVANCE", label: "Relevance" },
  { value: "BEST_SELLING", label: "Best selling" },
  { value: "PRICE_ASC", label: "Price: low to high" },
  { value: "PRICE_DESC", label: "Price: high to low" },
  { value: "NEWEST", label: "Newest" },
];

export default async function SearchPage(props: PageProps<"/search">) {
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const sort = SORTS.find((s) => s.value === params.sort)?.value ?? "RELEVANCE";
  const products = await commerce.getProducts({ query: q || undefined, first: 48, sort });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ocean-950">{q ? `Results for “${q}”` : "All products"}</h1>
      <form className="mt-6 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} type="search" placeholder="Search…" className="input max-w-sm" />
        <select name="sort" defaultValue={sort} className="input w-auto" aria-label="Sort">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn">Search</button>
        {q && (
          <Link href="/search" className="btn-secondary">
            Clear
          </Link>
        )}
      </form>
      <p className="mt-4 text-sm text-slate-500">{products.length} products</p>
      <div className="mt-4">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
