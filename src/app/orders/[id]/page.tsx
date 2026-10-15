import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Badge, Price } from "@/components/ui";
import { formatINR } from "@/lib/pricing";
import {
  canTransition,
  ORDER_STATUS_LABELS,
  TRACKING_STEPS,
  type StatusEvent,
} from "@/lib/orders";
import CancelButton from "./CancelButton";

export const metadata = { title: "Order Details" };

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "brand" {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED" || status === "RETURNED") return "danger";
  if (status === "PENDING") return "warning";
  return "brand";
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const order = await db.order.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { name: true } },
        },
      },
      payment: true,
      seller: { select: { storeName: true, storeSlug: true } },
    },
  });
  if (!order) notFound();

  const history = (order.statusHistory ?? []) as StatusEvent[];
  const reached = new Set(history.map((h) => h.status));
  reached.add(order.status);
  const cancellable = canTransition(order.status, "CANCELLED");
  const isTerminal = order.status === "CANCELLED" || order.status === "RETURNED";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {order.seller ? ` · Sold by ${order.seller.storeName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={statusTone(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          {cancellable && <CancelButton orderId={order.id} />}
        </div>
      </div>

      {/* Tracking timeline */}
      {!isTerminal && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Tracking</h2>
          <ol className="flex items-center">
            {TRACKING_STEPS.map((step, i) => {
              const done = reached.has(step);
              const current = order.status === step;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-fusion-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                      } ${current ? "ring-4 ring-fusion-200 dark:ring-fusion-900" : ""}`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="whitespace-nowrap text-[11px] text-slate-500">
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < TRACKING_STEPS.length - 1 && (
                    <span className={`mx-1 mb-5 h-0.5 flex-1 ${reached.has(TRACKING_STEPS[i + 1]!) ? "bg-fusion-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Items</h2>
          {order.items.map((item) => (
            <Card key={item.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {item.productName}
                </div>
                <div className="text-xs text-slate-500">
                  {item.variant?.name ? `${item.variant.name} · ` : ""}Qty {item.quantity}
                </div>
              </div>
              <Price price={Number(item.price)} size="sm" />
              <div className="w-20 text-right text-sm font-semibold">
                {formatINR(Number(item.price) * item.quantity)}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Delivery address</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {order.shipName}
              <br />
              {order.shipLine1}
              {order.shipLine2 ? `, ${order.shipLine2}` : ""}
              <br />
              {order.shipCity}, {order.shipState} {order.shipPostalCode}
              <br />
              {order.shipCountry} · {order.shipPhone}
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Payment</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Provider</dt><dd className="font-medium">{order.payment?.provider ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><Badge tone={order.paymentStatus === "PAID" ? "success" : "warning"}>{order.paymentStatus}</Badge></dd></div>
            </dl>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Price details</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatINR(Number(order.subtotal))}</dd></div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-600"><dt>Coupon discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>−{formatINR(Number(order.discount))}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd>{formatINR(Number(order.shippingFee))}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold dark:border-slate-700"><dt>Total</dt><dd>{formatINR(Number(order.total))}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
