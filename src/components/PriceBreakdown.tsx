"use client";

import { formatINR, FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { Card } from "./ui";

export type BreakdownItem = {
  quantity: number;
  unitPrice: number;
  mrp: number | null; // original MRP per unit, if higher than unitPrice
};

export type PriceSummary = {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  itemCount: number;
};

/**
 * Transparent price breakdown — shows the buyer exactly where their money goes.
 * Builds trust: MRP savings, coupon savings, delivery logic, and a clear total
 * with a "no hidden charges" promise.
 */
export function PriceBreakdown({
  summary,
  items,
  couponCode,
  compact = false,
}: {
  summary: PriceSummary;
  items: BreakdownItem[];
  couponCode?: string | null;
  compact?: boolean;
}) {
  const mrpTotal = items.reduce((s, it) => s + (it.mrp ?? it.unitPrice) * it.quantity, 0);
  const mrpSavings = Math.max(0, mrpTotal - summary.subtotal);
  const totalSavings = mrpSavings + summary.discount;
  const freeShip = summary.shippingFee === 0 && summary.subtotal > 0;
  const awayFromFree = Math.max(0, FREE_SHIPPING_THRESHOLD - (summary.subtotal - summary.discount));
  const progress = Math.min(100, ((summary.subtotal - summary.discount) / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Price details</h3>
      <dl className="space-y-2.5 text-sm">
        {/* Products */}
        <div className="flex justify-between">
          <dt className="text-slate-500">
            Products ({summary.itemCount} item{summary.itemCount === 1 ? "" : "s"})
          </dt>
          <dd className="font-medium text-slate-900 dark:text-white">{formatINR(summary.subtotal)}</dd>
        </div>
        {mrpSavings > 0 && (
          <div className="flex justify-between text-xs">
            <dt className="text-slate-400">MRP total</dt>
            <dd className="text-slate-400 line-through">{formatINR(mrpTotal)}</dd>
          </div>
        )}

        {/* Coupon */}
        {summary.discount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <dt>Coupon savings{couponCode ? ` (${couponCode})` : ""}</dt>
            <dd className="font-medium">−{formatINR(summary.discount)}</dd>
          </div>
        )}

        {/* Delivery */}
        <div className="flex justify-between">
          <dt className="text-slate-500">Delivery charge</dt>
          <dd className="font-medium">
            {freeShip ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                FREE
              </span>
            ) : (
              <span className="text-slate-900 dark:text-white">{formatINR(summary.shippingFee)}</span>
            )}
          </dd>
        </div>
        {!freeShip && awayFromFree > 0 && (
          <div className="rounded-xl bg-fusion-50 p-3 dark:bg-fusion-950">
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-fusion-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Add <strong>{formatINR(awayFromFree)}</strong> more for <strong className="text-emerald-600">FREE delivery</strong> 🎉
            </p>
          </div>
        )}
        {freeShip && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            🎉 You unlocked FREE delivery on this order!
          </p>
        )}

        {/* Total */}
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-700">
          <dt className="text-slate-900 dark:text-white">Total payable</dt>
          <dd className="text-slate-900 dark:text-white">{formatINR(summary.total)}</dd>
        </div>
      </dl>

      {/* Trust row */}
      {totalSavings > 0 && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          💰 You save {formatINR(totalSavings)} on this order
        </p>
      )}
      <p className="mt-2 text-center text-xs text-slate-400">
        ✅ No hidden charges — what you see is what you pay · GST included
      </p>
    </Card>
  );
}
