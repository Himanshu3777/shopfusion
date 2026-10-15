import { Suspense } from "react";
import { db } from "@/lib/db";
import { queryProducts, toURLSearchParams } from "@/lib/catalog";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading } from "@/components/ui";


type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Listing({ searchParams }: Props) {
  const sp = await searchParams;
  const params = toURLSearchParams(sp);
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <Suspense>
        <FilterSidebar categories={categories} brands={brands} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <h1 className="font-display mb-4 text-2xl font-bold">All products</h1>
        <Suspense>
          <ProductGrid items={result.items} page={result.page} totalPages={result.totalPages} total={result.total} />
        </Suspense>
      </div>
    </div>
  );
}

export default function ProductsPage(props: Props) {
  return (
    <Suspense fallback={<Loading label="Loading products…" />}>
      <Listing {...props} />
    </Suspense>
  );
}
