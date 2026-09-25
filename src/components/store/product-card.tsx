import Link from "next/link";

import type { Product } from "@/lib/commerce/types";
import { label } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  const { minVariantPrice, maxVariantPrice } = product.priceRange;
  const hasRange = minVariantPrice.amount !== maxVariantPrice.amount;
  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden">
        <ProductImage image={product.featuredImage} alt={product.title} productType={product.productType} />
        {!product.availableForSale && (
          <span className="absolute top-2 left-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs font-medium text-white">
            Sold out
          </span>
        )}
        {product.care.careLevel && (
          <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-ocean-800">
            {label(product.care.careLevel)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-medium text-slate-900 group-hover:text-ocean-700">{product.title}</h3>
        {product.care.scientificName && (
          <p className="text-xs text-slate-500 italic">{product.care.scientificName}</p>
        )}
        <p className="mt-auto pt-2 text-sm font-semibold text-slate-900">
          {hasRange && <span className="font-normal text-slate-500">From </span>}
          {formatMoney(minVariantPrice.amount, minVariantPrice.currencyCode)}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return <p className="rounded-lg bg-slate-50 p-8 text-center text-slate-500">No products found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
