import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/store/product-card";
import { commerce } from "@/lib/commerce";

export async function generateMetadata(props: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const result = await commerce.getCollection(handle);
  return { title: result?.collection.title, description: result?.collection.description };
}

export default async function CollectionPage(props: PageProps<"/collections/[handle]">) {
  const { handle } = await props.params;
  const result = await commerce.getCollection(handle);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ocean-950">{result.collection.title}</h1>
      {result.collection.description && (
        <p className="mt-2 max-w-2xl text-slate-600">{result.collection.description}</p>
      )}
      <div className="mt-8">
        <ProductGrid products={result.products} />
      </div>
    </div>
  );
}
