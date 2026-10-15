import { Suspense } from "react";
import { db } from "@/lib/db";
import { queryProducts, toURLSearchParams } from "@/lib/catalog";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState, Loading } from "@/components/ui";


type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Results({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const params = toURLSearchParams(sp);
  const [result, categories, brands] = await Promise.all([
    q.length >= 2 ? queryProducts(params) : Promise.resolve({ items: [], page: 1, limit: 24, total: 0, totalPages: 1 }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } } },
    }),
    db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">
        {q ? <>Results for <span className="text-fusion-700 dark:text-fusion-300">“{q}”</span></> : "Search products"}
      </h1>
      {q && q.length < 2 ? (
        <div className="mt-6">
          <EmptyState title="Keep typing…" hint="Enter at least 2 characters to search the catalog." />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <Suspense>
            <FilterSidebar categories={categories} brands={brands} />
          </Suspense>
          <div className="min-w-0 flex-1">
            <Suspense>
              <ProductGrid items={result.items} page={result.page} totalPages={result.totalPages} total={result.total} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage(props: Props) {
  return (
    <Suspense fallback={<Loading label="Searching…" />}>
      <Results {...props} />
    </Suspense>
  );
}
