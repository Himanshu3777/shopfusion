import { Suspense } from "react";
import { queryProducts, toURLSearchParams } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState, Loading } from "@/components/ui";


type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Results({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const params = toURLSearchParams(sp);
  const result = q.length >= 2
    ? await queryProducts(params)
    : { items: [], page: 1, limit: 24, total: 0, totalPages: 1 };

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
        <div className="mt-6">
          <Suspense>
            <ProductGrid items={result.items} page={result.page} totalPages={result.totalPages} total={result.total} />
          </Suspense>
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
