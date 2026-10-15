"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Badge, EmptyState, Loading, Pagination, Price, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";
import { api, type Paginated } from "../api";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: string;
  discountPrice: string | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  avgRating: number;
  reviewCount: number;
  brand: { name: string } | null;
  category: { name: string };
  seller: { storeName: string };
  images: { url: string }[];
};

export default function AdminProductsPage() {
  const { push } = useToast();
  const [data, setData] = useState<Paginated<ProductRow> | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (q.trim()) sp.set("q", q.trim());
      setData(await api<Paginated<ProductRow>>(`/api/admin/products?${sp}`));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }, [page, q, push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function toggle(id: string, patch: { isActive?: boolean; isFeatured?: boolean }) {
    try {
      await api(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      push("Product updated", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/products/${id}`, { method: "DELETE" });
      push("Product deleted", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Products</h1>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage(1)} />
        </div>
        <Button onClick={() => setPage(1)}>Search</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0].url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
                          )}
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.category.name}{p.brand ? ` · ${p.brand.name}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Price price={p.price} discountPrice={p.discountPrice} size="sm" /></td>
                      <td className="px-4 py-3">{p.stock}</td>
                      <td className="px-4 py-3 text-xs">{p.seller.storeName}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                          {p.isFeatured && <Badge tone="brand">Featured</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => toggle(p.id, { isActive: !p.isActive })}>
                            {p.isActive ? "Hide" : "Show"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => toggle(p.id, { isFeatured: !p.isFeatured })}>
                            {p.isFeatured ? "Unfeature" : "Feature"}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => remove(p.id, p.name)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
