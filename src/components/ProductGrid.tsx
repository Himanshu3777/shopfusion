"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, Pagination } from "./ui";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "@/lib/catalog";

export function ProductGrid({
  items,
  page,
  totalPages,
  total,
}: {
  items: ProductCardData[];
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const goToPage = (p: number) => {
    const next = new URLSearchParams(sp.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No products found"
        hint="Try adjusting your filters or search terms to find what you're looking for."
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500" role="status">
        {total} product{total === 1 ? "" : "s"} found
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
    </div>
  );
}
