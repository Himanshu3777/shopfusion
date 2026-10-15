import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { queryProducts, toURLSearchParams } from "@/lib/catalog";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading } from "@/components/ui";

export const metadata = { title: "Deals · ShopFusion", description: "Today's best deals and discounts on ShopFusion." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function DealsListing({ searchParams }: Props) {
  const sp = await searchParams;
  const params = toURLSearchParams(sp);
  params.set("onSale", "true");

  const [result, categories, brands] = await Promise.all([
    queryProducts(params),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } } },
    }),
    db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-glow-500 to-glow-600 px-6 py-8 text-slate-950">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Deals of the day</h1>
        <p className="mt-1 font-medium">Discounted picks across every category — while stocks last.</p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <Suspense>
          <FilterSidebar categories={categories} brands={brands} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <Suspense>
            <ProductGrid items={result.items} page={result.page} totalPages={result.totalPages} total={result.total} />
          </Suspense>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">
        Looking for something specific? <Link href="/products" className="font-medium text-fusion-700 hover:underline dark:text-fusion-300">Browse all products</Link>
      </p>
    </div>
  );
}

export default function DealsPage(props: Props) {
  return (
    <Suspense fallback={<Loading label="Loading deals…" />}>
      <DealsListing {...props} />
    </Suspense>
  );
}
