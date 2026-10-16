/**
 * Dynamic pricing engine (Flipkart/Amazon style).
 *
 * Profit-safe by design: every product's selling price (discountPrice) moves
 * only inside [minPrice, maxPrice]. minPrice is the profit floor (seller +
 * platform margin protected); maxPrice defaults to MRP (legal ceiling in India).
 *
 * Schedule: daily cron.
 *  - Festival period  -> prices DROP toward minPrice (sale mode)
 *  - Normal days      -> each product re-priced every 7-15 days (staggered)
 */

import { db } from "./db";

// ---------- Festival calendar (auto sale periods) ----------
type Festival = { name: string; start: string; end: string; depthPct: number };

const FESTIVALS: Festival[] = [
  { name: "Diwali Sale", start: "2026-10-20", end: "2026-11-08", depthPct: 15 },
  { name: "Christmas & New Year Sale", start: "2026-12-20", end: "2027-01-05", depthPct: 12 },
  { name: "Republic Day Sale", start: "2027-01-24", end: "2027-01-28", depthPct: 10 },
  { name: "Holi Sale", start: "2027-03-12", end: "2027-03-18", depthPct: 10 },
  { name: "Independence Day Sale", start: "2027-08-13", end: "2027-08-17", depthPct: 10 },
  { name: "Raksha Bandhan Sale", start: "2027-08-24", end: "2027-08-28", depthPct: 8 },
  { name: "Dussehra Sale", start: "2027-10-08", end: "2027-10-14", depthPct: 12 },
  { name: "Diwali Sale", start: "2027-11-01", end: "2027-11-10", depthPct: 15 },
];

export function activeFestival(now = new Date()): Festival | null {
  const t = now.toISOString().slice(0, 10);
  return FESTIVALS.find((f) => t >= f.start && t <= f.end) ?? null;
}

// ---------- Bounds ----------

/** Profit floor defaults to 85% of MRP — seller + platform margin protected. */
export function defaultMinPrice(mrp: number): number {
  return Math.round(mrp * 0.85 * 100) / 100;
}

/** Ceiling defaults to MRP (selling above MRP is not allowed in India). */
export function defaultMaxPrice(mrp: number): number {
  return mrp;
}

// Stagger normal-day cycles: 7-15 days per product, derived from id hash.
function cycleDaysFor(productId: string): number {
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  return 7 + (h % 9); // 7..15
}

export type PriceChange = {
  productId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
};

const MAX_BATCH = 500; // scale-safe: never update everything at once

/**
 * Run one pricing cycle. Returns the list of applied changes.
 * Safe to run daily: products are only touched when due.
 */
export async function runPricingCycle(now = new Date()): Promise<{ changes: PriceChange[]; festival: Festival | null }> {
  const festival = activeFestival(now);
  const changes: PriceChange[] = [];

  // Candidate pool: active products with stock. Bound the batch for scale.
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      price: true,
      discountPrice: true,
      stock: true,
      minPrice: true,
      maxPrice: true,
      lastPriceChange: true,
      reviewCount: true,
      createdAt: true,
    },
    orderBy: { lastPriceChange: "asc" },
    take: MAX_BATCH * 3,
  });

  for (const p of products) {
    if (changes.length >= MAX_BATCH) break;

    const mrp = Number(p.price);
    const current = p.discountPrice != null ? Number(p.discountPrice) : mrp;
    const minP = p.minPrice != null ? Number(p.minPrice) : defaultMinPrice(mrp);
    const maxP = p.maxPrice != null ? Number(p.maxPrice) : defaultMaxPrice(mrp);
    if (minP >= maxP) continue; // misconfigured bounds — skip safely

    let target = current;
    let reason = "";

    if (festival) {
      // SALE MODE: drop toward the profit floor by festival depth.
      const festivePrice = Math.max(minP, mrp * (1 - festival.depthPct / 100));
      if (current > festivePrice + 0.5) {
        target = festivePrice;
        reason = "festival";
      } else {
        continue; // already at/below festive price
      }
    } else {
      // NORMAL MODE: only touch products due for their 7-15 day cycle.
      // (After a festival ends, prices recover gradually through these cycles.)
      const cycleDays = cycleDaysFor(p.id);
      const due =
        !p.lastPriceChange ||
        now.getTime() - p.lastPriceChange.getTime() > cycleDays * 24 * 3600 * 1000;
      if (!due) continue;

      const ageDays = (now.getTime() - p.createdAt.getTime()) / (24 * 3600 * 1000);

      if (p.stock > 0 && p.stock < 10) {
        // Scarcity: nudge up (max +8%), never above ceiling.
        target = Math.min(maxP, current * 1.05);
        reason = "low_stock";
      } else if (p.stock > 100 && ageDays > 60) {
        // Clearance: drop toward floor (max -8%).
        target = Math.max(minP, current * 0.92);
        reason = "clearance";
      } else if (p.reviewCount > 50) {
        // Trending: small premium (+3%).
        target = Math.min(maxP, current * 1.03);
        reason = "trending";
      } else {
        // Gentle random walk ±2% for a "live market" feel.
        const drift = (Math.random() - 0.5) * 0.04;
        target = current * (1 + drift);
        reason = "fluctuation";
      }
      target = Math.min(maxP, Math.max(minP, target));
    }

    target = Math.round(target * 100) / 100;
    if (Math.abs(target - current) < 0.5) continue; // ignore dust

    // Clamp once more for safety, then apply + log.
    target = Math.min(maxP, Math.max(minP, target));
    const trend = target < current ? "DROP" : "HIKE";

    await db.product.update({
      where: { id: p.id },
      data: {
        discountPrice: target,
        // Ensure bounds exist for next cycles (profit floor!).
        minPrice: p.minPrice ?? defaultMinPrice(mrp),
        maxPrice: p.maxPrice ?? defaultMaxPrice(mrp),
        lastPriceChange: now,
        priceTrend: trend,
        priceTrendAt: now,
      },
    });
    await db.priceHistory.create({
      data: {
        productId: p.id,
        oldPrice: current,
        newPrice: target,
        reason: festival ? `festival:${festival.name}` : reason,
      },
    });
    changes.push({ productId: p.id, oldPrice: current, newPrice: target, reason });
  }

  return { changes, festival };
}
