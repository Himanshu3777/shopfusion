"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  Loading,
  ErrorState,
  EmptyState,
  Price,
  RatingStars,
  useToast,
} from "@/components/ui";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  discountPrice?: number | string | null;
  stock: number;
  avgRating: number;
  reviewCount: number;
  images: { url: string; alt?: string | null }[];
  brand?: { name: string } | null;
  seller?: { storeName: string } | null;
};
type WishlistItem = { id: string; product: Product };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok)
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json.data as T;
}

export default function WishlistClient() {
  const router = useRouter();
  const { push } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api<{ items: WishlistItem[] }>("/api/wishlist");
      setItems(d.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const removeItem = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/api/wishlist/items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      push("Removed from wishlist", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to remove", "error");
    } finally {
      setBusyId(null);
    }
  };

  const moveToCart = async (item: WishlistItem) => {
    setBusyId(item.id);
    try {
      await api("/api/wishlist/move", {
        method: "POST",
        body: JSON.stringify({ productId: item.product.id }),
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      push("Moved to cart", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to move to cart", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading your wishlist…" />;
  if (error) return <ErrorState title="Couldn't load your wishlist" hint={error} onRetry={load} />;
  if (items.length === 0)
    return (
      <EmptyState
        title="Your wishlist is empty"
        hint="Save products you love and find them here later."
        action={<Button onClick={() => router.push("/")}>Discover products</Button>}
      />
    );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const p = item.product;
        const img = p.images[0];
        return (
          <Card key={item.id} className="flex flex-col overflow-hidden">
            <Link href={`/products/${p.slug}`} className="block">
              {img ? (
                <img src={img.url} alt={img.alt ?? p.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
                  No image
                </div>
              )}
            </Link>
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <Link href={`/products/${p.slug}`} className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-fusion-600 dark:text-white">
                {p.name}
              </Link>
              <RatingStars value={p.avgRating} />
              <Price price={p.price} discountPrice={p.discountPrice} size="sm" />
              <div className="mt-auto flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={busyId === item.id || p.stock < 1}
                  onClick={() => moveToCart(item)}
                >
                  {p.stock < 1 ? "Out of stock" : "Move to cart"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${p.name} from wishlist`}
                >
                  ✕
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
