import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Badge, EmptyState, Button } from "@/components/ui";
import { formatINR } from "@/lib/pricing";
import { ORDER_STATUS_LABELS } from "@/lib/orders";

export const metadata = { title: "My Orders" };

const PAGE_SIZE = 10;

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "brand" {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED" || status === "RETURNED") return "danger";
  if (status === "PENDING") return "warning";
  return "brand";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/orders");
  const userId = (session.user as { id: string }).id;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        _count: { select: { items: true } },
        seller: { select: { storeName: true } },
      },
    }),
    db.order.count({ where: { userId } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">My Orders</h1>
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          hint="When you place an order, it will show up here."
          action={
            <Link href="/">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`}>
                <Card className="flex items-center justify-between p-4 transition hover:shadow-md">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{o.orderNumber}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {o._count.items} item{o._count.items === 1 ? "" : "s"}
                      {o.seller ? ` · ${o.seller.storeName}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatINR(Number(o.total))}</div>
                    <Badge tone={statusTone(o.status)} className="mt-1">
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link href={`/orders?page=${page - 1}`} aria-disabled={page <= 1}>
                <Button variant="secondary" disabled={page <= 1}>
                  ← Previous
                </Button>
              </Link>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Link href={`/orders?page=${page + 1}`}>
                <Button variant="secondary" disabled={page >= totalPages}>
                  Next →
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
