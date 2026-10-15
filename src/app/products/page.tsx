import { Suspense } from "react";
import { queryProducts, toURLSearchParams } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading } from "@/components/ui";


type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Listing({ searchParams }: Props) {
  const sp = await searchParams;
  const params = toURLSearchParams(sp);
  const result = await queryProducts(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display mb-4 text-2xl font-bold">All products</h1>
      <Suspense>
        <ProductGrid items={result.items} page={result.page} totalPages={result.totalPages} total={result.total} />
      </Suspense>
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
