"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  Input,
  Badge,
  Loading,
  ErrorState,
  EmptyState,
  Spinner,
  Price,
  RatingStars,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/pricing";
import { PriceBreakdown } from "@/components/PriceBreakdown";

type CartImage = { url: string; alt?: string | null };
type CartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  discountPrice?: number | string | null;
  stock: number;
  avgRating: number;
  images: CartImage[];
  seller?: { storeName: string } | null;
};
type CartVariant = {
  id: string;
  name: string;
  sku: string;
  price?: number | string | null;
  stock: number;
  attributes?: Record<string, string> | null;
};
type CartItem = {
  id: string;
  quantity: number;
  savedForLater: boolean;
  unitPrice: number;
  lineTotal: number;
  product: CartProduct;
  variant: CartVariant | null;
};
type CartData = {
  items: CartItem[];
  summary: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    tax: number;
    total: number;
    itemCount: number;
  };
  coupon: { code: string | null; discount: number; message: string | null };
};

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

function ItemRow({
  item,
  busy,
  onQty,
  onRemove,
  onToggleSave,
}: {
  item: CartItem;
  busy: boolean;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onToggleSave: (id: string, saved: boolean) => void;
}) {
  const img = item.product.images[0];
  return (
    <Card className="flex gap-4 p-4">
      <Link href={`/products/${item.product.slug}`} className="shrink-0">
        {img ? (
          <img src={img.url} alt={img.alt ?? item.product.name} className="h-24 w-24 rounded-lg object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
            No image
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${item.product.slug}`} className="font-medium text-slate-900 hover:text-fusion-600 dark:text-white">
          {item.product.name}
        </Link>
        {item.variant && (
          <div className="mt-1 text-xs text-slate-500">
            Variant: {item.variant.name}
            {item.variant.attributes &&
              ` (${Object.entries(item.variant.attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")})`}
          </div>
        )}
        {item.product.seller && (
          <div className="mt-0.5 text-xs text-slate-500">Sold by {item.product.seller.storeName}</div>
        )}
        <div className="mt-1">
          <RatingStars value={item.product.avgRating} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={busy || item.quantity <= 1} onClick={() => onQty(item.id, item.quantity - 1)} aria-label="Decrease quantity">−</Button>
            <span className="w-8 text-center font-medium">{item.quantity}</span>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onQty(item.id, item.quantity + 1)} aria-label="Increase quantity">+</Button>
          </div>
          <button
            className="text-xs font-medium text-fusion-600 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => onToggleSave(item.id, !item.savedForLater)}
          >
            {item.savedForLater ? "Move to cart" : "Save for later"}
          </button>
          <button
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="text-right">
        <Price price={item.product.price} discountPrice={item.product.discountPrice} size="md" />
        <div className="mt-1 text-sm text-slate-500">Line total: {formatINR(item.lineTotal)}</div>
      </div>
    </Card>
  );
}

export default function CartClient() {
  const router = useRouter();
  const { push } = useToast();
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async (coupon?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const q = coupon ? `?coupon=${encodeURIComponent(coupon)}` : "";
      const d = await api<CartData>(`/api/cart${q}`);
      setData(d);
      setCouponCode(d.coupon.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const mutate = async (id: string, fn: () => Promise<unknown>, msg?: string) => {
    setBusyId(id);
    try {
      await fn();
      if (msg) push(msg, "success");
      await load(couponCode);
    } catch (e) {
      push(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplying(true);
    try {
      const d = await api<CartData>(`/api/cart?coupon=${encodeURIComponent(code)}`);
      setData(d);
      setCouponCode(d.coupon.code);
      if (d.coupon.discount > 0) {
        push(`Coupon ${d.coupon.code} applied`, "success");
      } else {
        push(d.coupon.message ?? "Coupon not applicable", "error");
      }
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to apply coupon", "error");
    } finally {
      setApplying(false);
    }
  };

  if (loading && !data) return <Loading label="Loading your cart…" />;
  if (error && !data) return <ErrorState title="Couldn't load your cart" hint={error} onRetry={() => load(couponCode)} />;

  const items = data?.items ?? [];
  const active = items.filter((i) => !i.savedForLater);
  const saved = items.filter((i) => i.savedForLater);

  if (items.length === 0)
    return (
      <EmptyState
        title="Your cart is empty"
        hint="Discover something you love and add it to your cart."
        action={<Button onClick={() => router.push("/")}>Continue shopping</Button>}
      />
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {active.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onQty={(id, qty) => mutate(id, () => api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity: qty }) }))}
            onRemove={(id) => mutate(id, () => api(`/api/cart/items/${id}`, { method: "DELETE" }), "Item removed")}
            onToggleSave={(id, savedForLater) => mutate(id, () => api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ savedForLater }) }), savedForLater ? "Saved for later" : "Moved to cart")}
          />
        ))}

        {saved.length > 0 && (
          <div className="pt-4">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
              Saved for later ({saved.length})
            </h2>
            <div className="space-y-4">
              {saved.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onQty={(id, qty) => mutate(id, () => api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity: qty }) }))}
                  onRemove={(id) => mutate(id, () => api(`/api/cart/items/${id}`, { method: "DELETE" }), "Item removed")}
                  onToggleSave={(id, savedForLater) => mutate(id, () => api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ savedForLater }) }), savedForLater ? "Saved for later" : "Moved to cart")}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Coupon</h2>
          {data?.coupon.discount ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950">
              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                {data.coupon.code} — {formatINR(data.coupon.discount)} off
              </span>
              <button
                className="text-xs font-medium text-slate-500 hover:underline"
                onClick={() => {
                  setCouponInput("");
                  setCouponCode(null);
                  load(null);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                aria-label="Coupon code"
              />
              <Button onClick={applyCoupon} disabled={applying || !couponInput.trim()}>
                {applying ? <Spinner size="sm" /> : "Apply"}
              </Button>
            </div>
          )}
          {data?.coupon.message && !data.coupon.discount && (
            <p className="mt-2 text-xs text-red-600">{data.coupon.message}</p>
          )}
        </Card>

        {data && (
          <PriceBreakdown
            summary={data.summary}
            items={active.map((it) => ({
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              mrp: it.product.price != null ? Number(it.product.price) : null,
            }))}
            couponCode={data.coupon.code}
            compact
          />
        )}
        <div className="mt-4">
          <Button
            className="w-full"
            disabled={active.length === 0}
            onClick={() =>
              router.push(couponCode ? `/checkout?coupon=${encodeURIComponent(couponCode)}` : "/checkout")
            }
          >
            Proceed to checkout
          </Button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Totals are recomputed securely at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
