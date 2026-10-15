import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { Card, Badge, EmptyState, Price } from "@/components/ui";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { SellerNav } from "./SellerNav";
import { requireSellerPage } from "./auth";

export const metadata = { title: "Seller Dashboard · ShopFusion" };

const LOW_STOCK_THRESHOLD = 10;

export default async function SellerDashboardPage() {
  const { seller } = await requireSellerPage();
  if (!seller) return null;

  const activeWhere = { sellerId: seller.id, status: { not: "CANCELLED" as const } };
  const [revAgg, orderCount, unitsAgg, rated, lowStock, recentOrders] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, where: activeWhere }),
    db.order.count({ where: activeWhere }),
    db.orderItem.aggregate({ _sum: { quantity: true }, where: { order: activeWhere } }),
    db.product.findMany({ where: { sellerId: seller.id }, select: { avgRating: true } }),
    db.product.findMany({
      where: { sellerId: seller.id, stock: { lt: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, slug: true, stock: true },
      orderBy: { stock: "asc" },
      take: 10,
    }),
    db.order.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  const ratedProducts = rated.filter((p) => p.avgRating > 0);
  const avgRating =
    ratedProducts.length > 0
      ? Math.round((ratedProducts.reduce((s, p) => s + p.avgRating, 0) / ratedProducts.length) * 10) / 10
      : 0;

  const cards = [
    { label: "Revenue", value: formatINR(Number(revAgg._sum.total ?? 0)) },
    { label: "Orders", value: String(orderCount) },
    { label: "Units sold", value: String(unitsAgg._sum.quantity ?? 0) },
    { label: "Avg. rating", value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SellerNav />
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{seller.storeName}</h1>
          <p className="text-sm text-slate-500">Welcome to your seller dashboard</p>
        </div>
        <Link
          href="/seller/products/new"
          className="rounded-xl bg-fusion-600 px-4 py-2 text-sm font-medium text-white hover:bg-fusion-700"
        >
          + Add product
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" hint="Orders for your products will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-slate-500">
                      {o._count.items} item{o._count.items === 1 ? "" : "s"} ·{" "}
                      <Price price={Number(o.total)} size="sm" />
                    </p>
                  </div>
                  <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" ? "danger" : "warning"}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/seller/orders" className="mt-4 inline-block text-sm font-medium text-fusion-600 hover:underline">
            View all orders →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Low stock alerts</h2>
          {lowStock.length === 0 ? (
            <EmptyState title="Stock looks healthy" hint={`No products below ${LOW_STOCK_THRESHOLD} units.`} />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <Link href={`/seller/products/${p.id}/edit`} className="text-sm font-medium hover:underline">
                    {p.name}
                  </Link>
                  <Badge tone={p.stock === 0 ? "danger" : "warning"}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/seller/products" className="mt-4 inline-block text-sm font-medium text-fusion-600 hover:underline">
            Manage products →
          </Link>
        </Card>
      </div>
    </div>
  );
}
