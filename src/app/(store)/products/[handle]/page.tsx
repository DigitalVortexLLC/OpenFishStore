import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/store/add-to-cart";
import { CareSheet, LiveArrivalNote } from "@/components/store/care-sheet";
import { ProductImage } from "@/components/store/product-image";
import { commerce } from "@/lib/commerce";

export async function generateMetadata(props: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const product = await commerce.getProduct(handle);
  return { title: product?.title, description: product?.description.slice(0, 160) };
}

export default async function ProductPage(props: PageProps<"/products/[handle]">) {
  const { handle } = await props.params;
  const product = await commerce.getProduct(handle);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-ocean-700">
          Home
        </Link>{" "}
        / <span>{product.productType || "Products"}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200">
            <ProductImage
              image={product.featuredImage}
              alt={product.title}
              productType={product.productType}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((img) => (
                <div key={img.url} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                  <ProductImage image={img} alt={product.title} sizes="12vw" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-ocean-950">{product.title}</h1>
            {product.care.scientificName && (
              <p className="mt-1 text-slate-500 italic">{product.care.scientificName}</p>
            )}
          </div>
          <AddToCart variants={product.variants} />
          {product.care.live && <LiveArrivalNote />}
          <div className="rich-text text-slate-700" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          <CareSheet care={product.care} />
        </div>
      </div>
    </div>
  );
}
