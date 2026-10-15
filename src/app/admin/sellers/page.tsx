"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Select, Badge, EmptyState, Loading, Pagination, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";
import { api, type Paginated } from "../api";

type SellerRow = {
  id: string;
  storeName: string;
  storeSlug: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  user: { id: string; name: string | null; email: string; isBanned: boolean };
  _count: { products: number; orders: number };
};

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;

const TONE: Record<SellerRow["status"], "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export default function AdminSellersPage() {
  const { push } = useToast();
  const [data, setData] = useState<Paginated<SellerRow> | null>(null);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (status !== "ALL") sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());
      setData(await api<Paginated<SellerRow>>(`/api/admin/sellers?${sp}`));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load sellers", "error");
    } finally {
      setLoading(false);
    }
  }, [page, status, q, push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function setSellerStatus(id: string, next: SellerRow["status"]) {
    if (!confirm(`Mark this seller as ${next}?`)) return;
    try {
      await api(`/api/admin/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      push(`Seller ${next.toLowerCase()}`, "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Sellers</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search store name…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage(1)} />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No sellers found" />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {data.items.map((s) => (
                <Card key={s.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">{s.storeName}</p>
                        <Badge tone={TONE[s.status]}>{s.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {s.user.name ?? s.user.email} · {s.user.email} · /{s.storeSlug}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s._count.products} products · {s._count.orders} orders
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {s.status === "PENDING" && (
                        <>
                          <Button size="sm" onClick={() => setSellerStatus(s.id, "APPROVED")}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => setSellerStatus(s.id, "REJECTED")}>Reject</Button>
                        </>
                      )}
                      {s.status === "APPROVED" && (
                        <Button size="sm" variant="secondary" onClick={() => setSellerStatus(s.id, "SUSPENDED")}>Suspend</Button>
                      )}
                      {s.status === "SUSPENDED" && (
                        <Button size="sm" onClick={() => setSellerStatus(s.id, "APPROVED")}>Reinstate</Button>
                      )}
                      {s.status === "REJECTED" && (
                        <Button size="sm" onClick={() => setSellerStatus(s.id, "APPROVED")}>Approve</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
