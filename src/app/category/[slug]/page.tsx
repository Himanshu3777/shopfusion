import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { queryProducts, toURLSearchParams } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading } from "@/components/ui";


type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug }, select: { name: true, description: true } });
  return { title: category ? `${category.name} · ShopFusion` : "Category not found", description: category?.description ?? undefined };
}

async function CategoryListing({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await db.category.findUnique({
    where: { slug },
    include: {
      children: { where: { isActive: true }, select: { id: true } },
    },
  });
  if (!category || !category.isActive) notFound();

  const categoryIds = [category.id, ...category.children.map((c) => c.id)];
  const paramsObj = toURLSearchParams(sp);

  const result = await queryProducts(paramsObj, { categoryId: { in: categoryIds } });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Category header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-fusion-700 to-fusion-950 text-white">
        {category.image && <img src={category.image} alt={category.name} className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative px-6 py-10">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{category.name}</h1>
          {category.description && <p className="mt-2 max-w-2xl text-white/80">{category.description}</p>}
        </div>
      </div>

      <div className="mt-6">
        <Suspense>
          <ProductGrid items={result.items} page={result.page} totalPages={result.totalPages} total={result.total} />
        </Suspense>
      </div>
    </div>
  );
}

export default function CategoryPage(props: Props) {
  return (
    <Suspense fallback={<Loading label="Loading category…" />}>
      <CategoryListing {...props} />
    </Suspense>
  );
}
