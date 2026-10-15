"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "sf-recent";
const MAX = 12;

export type RecentItem = { slug: string; name: string; image: string | null; price: number };

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Drop on a product page — records this product in localStorage. Renders nothing. */
export function RecordView({ item }: { item: RecentItem }) {
  useEffect(() => {
    try {
      const next = [item, ...readRecent().filter((x) => x.slug !== item.slug)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [item.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Home-page section reading the visitor's recently viewed products. */
export function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    // Defer past mount so the server render (empty) hydrates cleanly.
    queueMicrotask(() => {
      setItems(readRecent());
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <section aria-label="Recently viewed" className="mx-auto w-full max-w-7xl px-4 py-10">
      <h2 className="font-display text-xl font-bold">Recently viewed</h2>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/products/${item.slug}`}
            className="w-40 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="aspect-square bg-slate-100 dark:bg-slate-800">
              {item.image ? (
                <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">◈</div>
              )}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-xs font-medium leading-snug">{item.name}</p>
              <p className="mt-1 text-sm font-bold">₹{item.price.toLocaleString("en-IN")}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
