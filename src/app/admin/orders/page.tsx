"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Select, Badge, EmptyState, Loading, Pagination, Price, useToast } from "@/components/ui";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import type { OrderStatus } from "@prisma/client";
import { AdminNav } from "../AdminNav";
import { OrderStatusSelect } from "../../seller/orders/OrderStatusSelect";
import { api, type Paginated } from "../api";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
  user: { name: string | null; email: string };
  seller: { storeName: string } | null;
  _count: { items: number };
};

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"] as const;

export default function AdminOrdersPage() {
  const { push } = useToast();
  const [data, setData] = useState<Paginated<OrderRow> | null>(null);
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
      setData(await api<Paginated<OrderRow>>(`/api/admin/orders?${sp}`));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [page, status, q, push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="w-52">
          <Select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All statuses" : ORDER_STATUS_LABELS[s as OrderStatus]}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search order number…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage(1)} />
        </div>
        <Button onClick={() => setPage(1)}>Search</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No orders found" />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.orderNumber}</p>
                        <p className="text-xs text-slate-500">
                          {o._count.items} item{o._count.items === 1 ? "" : "s"} · {new Date(o.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">{o.user.name ?? o.user.email}</td>
                      <td className="px-4 py-3 text-xs">{o.seller?.storeName ?? "—"}</td>
                      <td className="px-4 py-3"><Price price={o.total} size="sm" /></td>
                      <td className="px-4 py-3">
                        <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" ? "danger" : "warning"}>
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusSelect orderId={o.id} current={o.status} basePath="/api/admin/orders" />
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
