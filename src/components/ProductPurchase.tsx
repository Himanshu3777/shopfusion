"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Price, useToast } from "./ui";
import { cn } from "@/lib/utils";
import type { ProductDetailData } from "@/lib/catalog";

export function ProductPurchase({ product }: { product: ProductDetailData }) {
  const { push } = useToast();
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? null,
    [product.variants, variantId]
  );
  const unitPrice = variant?.price ?? product.effectivePrice;
  const stock = variant ? variant.stock : product.stock;
  const outOfStock = stock <= 0;

  const addToCart = async (): Promise<boolean> => {
    setBusy(true);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, variantId, quantity: qty }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) {
        push("Added to cart", "success");
        return true;
      }
      push(j?.error?.message ?? "Could not add to cart", "error");
      return false;
    } catch {
      push("Could not add to cart", "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const buyNow = async () => {
    if (await addToCart()) router.push("/cart");
  };

  const toggleWishlist = async () => {
    try {
      const r = await fetch("/api/wishlist", {
        method: wishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok !== false) {
        setWishlisted(!wishlisted);
        push(wishlisted ? "Removed from wishlist" : "Saved to wishlist", "success");
      } else {
        push(j?.error?.message ?? "Could not update wishlist", "error");
      }
    } catch {
      push("Could not update wishlist", "error");
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Variant selector */}
      {product.variants.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Variant{variant ? `: ${variant.name}` : ""}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id === variantId ? null : v.id)}
                aria-pressed={v.id === variantId}
                disabled={v.stock <= 0}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                  v.id === variantId
                    ? "border-fusion-600 bg-fusion-50 font-medium text-fusion-800 dark:bg-fusion-950 dark:text-fusion-200"
                    : "border-slate-300 hover:border-fusion-400 dark:border-slate-700"
                )}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Price price={product.price} discountPrice={variant?.price ?? product.discountPrice} size="lg" />
        {product.discountPct > 0 && !variant?.price && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
            {product.discountPct}% OFF
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500">
        {outOfStock ? "Currently out of stock" : stock < 10 ? `Only ${stock} left in stock` : "In stock"} · Sold by {product.seller.storeName}
      </p>

      {/* Qty + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700">
          <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-lg">−</button>
          <span className="w-8 text-center text-sm font-medium" aria-live="polite">{qty}</span>
          <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-3 py-2 text-lg">+</button>
        </div>
        <Button onClick={addToCart} loading={busy} disabled={outOfStock} className="flex-1 sm:flex-none">
          Add to cart · ₹{(unitPrice * qty).toLocaleString("en-IN")}
        </Button>
        <Button variant="secondary" onClick={buyNow} loading={busy} disabled={outOfStock}>
          Buy now
        </Button>
        <button
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          className={cn(
            "rounded-xl border px-3 py-2 text-xl transition",
            wishlisted
              ? "border-fusion-600 bg-fusion-50 text-fusion-700 dark:bg-fusion-950 dark:text-fusion-300"
              : "border-slate-300 text-slate-500 hover:text-fusion-600 dark:border-slate-700"
          )}
        >
          {wishlisted ? "♥" : "♡"}
        </button>
      </div>
    </div>
  );
}
