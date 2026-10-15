import { db } from "@/lib/db";
import { Card, Badge, EmptyState, Price } from "@/components/ui";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { SellerNav } from "../SellerNav";
import { requireSellerPage } from "../auth";
import { OrderStatusSelect } from "./OrderStatusSelect";

export const metadata = { title: "Orders · ShopFusion" };

export default async function SellerOrdersPage() {
  const { seller } = await requireSellerPage();
  if (!seller) return null;

  const orders = await db.order.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { include: { product: { select: { name: true } } } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SellerNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Orders ({orders.length})</h1>

      <div className="mt-6">
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" hint="Orders for your products will appear here." />
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((o) => (
              <Card key={o.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{o.orderNumber}</p>
                      <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" ? "danger" : "warning"}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {o.user.name ?? o.user.email} · {new Date(o.createdAt).toLocaleDateString("en-IN")}
                    </p>
                    <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {o.items.map((it) => (
                        <li key={it.id}>
                          {it.quantity} × {it.productName} <span className="text-slate-400">({it.sku})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Price price={Number(o.total)} />
                    <div className="w-44">
                      <OrderStatusSelect orderId={o.id} current={o.status} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
