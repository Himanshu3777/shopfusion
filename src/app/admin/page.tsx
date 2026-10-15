import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { Card, Badge } from "@/components/ui";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { AdminNav } from "./AdminNav";
import { requireAdminPage } from "./auth";

export const metadata = { title: "Admin Dashboard · ShopFusion" };

export default async function AdminDashboardPage() {
  await requireAdminPage();

  const [revAgg, totalOrders, totalUsers, sellerGroups, pendingOrders, bestGroups, recentOrders] =
    await Promise.all([
      db.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
      db.order.count(),
      db.user.count(),
      db.seller.groupBy({ by: ["status"], _count: true }),
      db.order.count({ where: { status: "PENDING" } }),
      db.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: { order: { status: { not: "CANCELLED" } } },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          seller: { select: { storeName: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

  const sellersByStatus = Object.fromEntries(sellerGroups.map((g) => [g.status, g._count]));
  const bestProducts = await db.product.findMany({
    where: { id: { in: bestGroups.map((g) => g.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(bestProducts.map((p) => [p.id, p.name]));
  const best = bestGroups.map((g) => ({ id: g.productId, name: nameById.get(g.productId) ?? "Unknown", units: g._sum.quantity ?? 0 }));
  const maxUnits = Math.max(1, ...best.map((b) => b.units));

  const cards = [
    { label: "Total revenue", value: formatINR(Number(revAgg._sum.total ?? 0)), href: "/admin/orders" },
    { label: "Total orders", value: String(totalOrders), href: "/admin/orders" },
    { label: "Total users", value: String(totalUsers), href: "/admin/users" },
    { label: "Total sellers", value: String(sellerGroups.reduce((s, g) => s + g._count, 0)), href: "/admin/sellers" },
    { label: "Pending orders", value: String(pendingOrders), href: "/admin/orders" },
    { label: "Sellers awaiting review", value: String(sellersByStatus["PENDING"] ?? 0), href: "/admin/sellers" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <h1 className="mt-6 font-display text-3xl font-bold">Admin dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-5 transition hover:shadow-md">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Best sellers (units sold)</h2>
          {best.length === 0 ? (
            <p className="text-sm text-slate-500">No sales yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {best.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="max-w-[70%] truncate font-medium">{b.name}</span>
                    <span className="text-slate-500">{b.units} sold</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-fusion-600" style={{ width: `${(b.units / maxUnits) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-slate-500">
                      {o.user.name ?? o.user.email} · {o.seller?.storeName ?? "—"}
                    </p>
                  </div>
                  <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" ? "danger" : "warning"}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
