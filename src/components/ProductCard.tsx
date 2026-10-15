"use client";

import Link from "next/link";
import { Badge, Button, Price, RatingStars, useToast } from "./ui";
import type { ProductCardData } from "@/lib/catalog";

export function ProductCard({ product }: { product: ProductCardData }) {
  const { push } = useToast();
  const outOfStock = product.stock <= 0;

  const addToCart = async () => {
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) push("Added to cart", "success");
      else push(j?.error?.message ?? "Could not add to cart", "error");
    } catch {
      push("Could not add to cart", "error");
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800" aria-label={product.name}>
        {product.image ? (
          <img
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            loading="lazy"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fbk) {
                el.dataset.fbk = "1";
                el.src = `https://placehold.co/600x600/6D28D9/white?text=${encodeURIComponent(product.name)}`;
              }
            }}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">◈</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.discountPct > 0 && <Badge tone="danger">−{product.discountPct}%</Badge>}
          {outOfStock && <Badge tone="neutral">Out of stock</Badge>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.brand && <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{product.brand.name}</p>}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-fusion-700 dark:hover:text-fusion-300">
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5">
          <RatingStars value={product.avgRating} />
          <span className="text-xs text-slate-500">({product.reviewCount})</span>
        </div>
        <Price price={product.price} discountPrice={product.discountPrice} size="sm" />
        <div className="mt-auto pt-2">
          <Button size="sm" className="w-full" onClick={addToCart} disabled={outOfStock}>
            {outOfStock ? "Out of stock" : "Add to cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
