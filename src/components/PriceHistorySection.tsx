import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { Card } from "./ui";

const REASON_LABELS: Record<string, string> = {
  festival: "🎉 Festival sale",
  low_stock: "🔥 High demand",
  clearance: "📦 Clearance",
  trending: "⭐ Trending",
  fluctuation: "📊 Market update",
  manual: "✏️ Seller update",
};

function reasonLabel(reason: string): string {
  const base = reason.split(":")[0] ?? reason;
  return REASON_LABELS[base] ?? "📊 Price update";
}

/** Amazon-style price history for a product. Wrapped in Suspense by callers. */
export async function PriceHistorySection({ productId }: { productId: string }) {
  const history = await db.priceHistory.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (history.length === 0) return null;

  const prices = history.map((h) => Number(h.newPrice));
  const lowest = Math.min(...prices, ...history.map((h) => Number(h.oldPrice)));

  return (
    <Card className="mt-8 p-6">
      <h2 className="font-display text-lg font-bold">Price history</h2>
      <p className="mt-1 text-xs text-slate-500">
        Lowest recent price: <strong className="text-emerald-600">{formatINR(lowest)}</strong> · Prices update automatically based on demand & festivals
      </p>
      <ol className="mt-4 space-y-0">
        {history.map((h, i) => {
          const oldP = Number(h.oldPrice);
          const newP = Number(h.newPrice);
          const dropped = newP < oldP;
          return (
            <li key={h.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-slate-800">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${dropped ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-amber-100 text-amber-700 dark:bg-amber-950"}`}>
                {dropped ? "↓" : "↑"}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium">{formatINR(oldP)} → {formatINR(newP)}</span>
                <span className="ml-2 text-xs text-slate-500">{reasonLabel(h.reason)}</span>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {new Date(h.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              {i === 0 && (
                <span className="shrink-0 rounded-full bg-fusion-100 px-2 py-0.5 text-[10px] font-bold text-fusion-700 dark:bg-fusion-950 dark:text-fusion-300">
                  LATEST
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
