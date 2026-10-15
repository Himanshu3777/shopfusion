import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { formatINR } from "@/lib/pricing";

export const metadata = { title: "Order Confirmed" };

type PlacedOrder = { id: string; orderNumber: string; total: number; paymentProvider?: string };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string }>;
}) {
  const params = await searchParams;
  let orders: PlacedOrder[] = [];
  try {
    const parsed = JSON.parse(params.orders ?? "[]");
    if (Array.isArray(parsed)) orders = parsed;
  } catch {
    orders = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-950">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {orders.length > 0 ? "Order placed successfully!" : "Thank you!"}
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {orders.length > 0
          ? orders.some((o) => o.paymentProvider === "COD")
            ? `Your ${orders.length === 1 ? "order is" : `${orders.length} orders are`} booked! Pay in cash when ${orders.length === 1 ? "it arrives" : "they arrive"} at your doorstep.`
            : `Your payment was approved and ${orders.length === 1 ? "your order is" : `${orders.length} orders are`} confirmed. A confirmation email is on its way.`
          : "We couldn't find order details for this session."}
      </p>

      {orders.length > 0 && (
        <div className="mt-8 space-y-3 text-left">
          {orders.map((o) => (
            <Card key={o.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{o.orderNumber}</div>
                <div className="text-sm text-slate-500">
                  {o.paymentProvider === "COD" ? (
                    <Badge tone="warning">💵 Cash on Delivery</Badge>
                  ) : o.paymentProvider === "RAZORPAY" ? (
                    <Badge tone="success">📱 Paid online (UPI)</Badge>
                  ) : (
                    <Badge tone="success">Paid</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatINR(o.total)}</div>
                <Link href={`/orders/${o.id}`} className="text-xs font-medium text-fusion-600 hover:underline">
                  Track order
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/orders">
          <Button>View my orders</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
