"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select } from "./ui";
import { cn } from "@/lib/utils";

export type FilterCategory = { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[] };
export type FilterBrand = { id: string; name: string; slug: string };

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
  { value: "popularity", label: "Most Popular" },
];

export function FilterSidebar({
  categories,
  brands,
}: {
  categories: FilterCategory[];
  brands: FilterBrand[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ?? "");

  const apply = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const toggleInList = (key: "category" | "brand", slug: string) => {
    const cur = (sp.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
    apply({ [key]: next.length ? next.join(",") : null });
  };

  const isChecked = (key: "category" | "brand", slug: string) =>
    (sp.get(key) ?? "").split(",").map((s) => s.trim()).includes(slug);

  const submitPrice = (e: React.FormEvent) => {
    e.preventDefault();
    apply({ minPrice: minPrice.trim() || null, maxPrice: maxPrice.trim() || null });
  };

  const hasActive =
    ["category", "brand", "minPrice", "maxPrice", "minRating", "inStock", "onSale", "sort"].some((k) => sp.get(k));

  return (
    <aside className="w-full shrink-0 lg:w-64" aria-label="Product filters">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Filters</h2>
          {hasActive && (
            <button onClick={() => router.push(pathname)} className="text-xs font-medium text-fusion-700 hover:underline dark:text-fusion-300">
              Clear all
            </button>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <fieldset className="border-t border-slate-100 py-3 dark:border-slate-800">
            <legend className="text-sm font-medium">Category</legend>
            <div className="nice-scroll mt-2 max-h-56 space-y-1.5 overflow-y-auto">
              {categories.map((c) => (
                <div key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={isChecked("category", c.slug)} onChange={() => toggleInList("category", c.slug)} className="h-4 w-4 rounded accent-fusion-600" />
                    <span className="truncate">{c.name}</span>
                  </label>
                  {c.children.map((ch) => (
                    <label key={ch.id} className="flex cursor-pointer items-center gap-2 pl-6 text-sm text-slate-600 dark:text-slate-300">
                      <input type="checkbox" checked={isChecked("category", ch.slug)} onChange={() => toggleInList("category", ch.slug)} className="h-4 w-4 rounded accent-fusion-600" />
                      <span className="truncate">{ch.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {/* Brands */}
        {brands.length > 0 && (
          <fieldset className="border-t border-slate-100 py-3 dark:border-slate-800">
            <legend className="text-sm font-medium">Brand</legend>
            <div className="nice-scroll mt-2 max-h-48 space-y-1.5 overflow-y-auto">
              {brands.map((b) => (
                <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={isChecked("brand", b.slug)} onChange={() => toggleInList("brand", b.slug)} className="h-4 w-4 rounded accent-fusion-600" />
                  <span className="truncate">{b.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Price */}
        <form onSubmit={submitPrice} className="border-t border-slate-100 py-3 dark:border-slate-800">
          <p className="text-sm font-medium">Price (₹)</p>
          <div className="mt-2 flex items-center gap-2">
            <Input aria-label="Minimum price" inputMode="numeric" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <span className="text-slate-400">–</span>
            <Input aria-label="Maximum price" inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="mt-2 w-full">Apply price</Button>
        </form>

        {/* Rating */}
        <div className="border-t border-slate-100 py-3 dark:border-slate-800">
          <Select label="Minimum rating" value={sp.get("minRating") ?? ""} onChange={(e) => apply({ minRating: e.target.value || null })}>
            <option value="">Any rating</option>
            <option value="4">4★ & above</option>
            <option value="3">3★ & above</option>
            <option value="2">2★ & above</option>
          </Select>
        </div>

        {/* Toggles */}
        <div className="space-y-2 border-t border-slate-100 py-3 dark:border-slate-800">
          {(
            [
              ["inStock", "In stock only"],
              ["onSale", "On sale"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between text-sm">
              <span>{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={sp.get(key) === "true"}
                onClick={() => apply({ [key]: sp.get(key) === "true" ? null : "true" })}
                className={cn(
                  "relative h-6 w-11 rounded-full transition",
                  sp.get(key) === "true" ? "bg-fusion-600" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", sp.get(key) === "true" ? "left-[22px]" : "left-0.5")} />
              </button>
            </label>
          ))}
        </div>

        {/* Sort */}
        <div className="border-t border-slate-100 py-3 dark:border-slate-800">
          <Select label="Sort by" value={sp.get("sort") ?? "relevance"} onChange={(e) => apply({ sort: e.target.value === "relevance" ? null : e.target.value })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>
    </aside>
  );
}
