import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireSeller } from "@/lib/rbac";

/** GET /api/seller/analytics — revenue, orders, units, ratings, top products. */
export const GET = withErrorHandling(async () => {
  const { seller } = await requireSeller();
  if (!seller) throw new ApiError(403, "Seller profile not found");

  const activeWhere = { sellerId: seller.id, status: { not: "CANCELLED" as const } };

  const [revAgg, orderCount, unitsAgg, ownProducts, topGroups] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, where: activeWhere }),
    db.order.count({ where: activeWhere }),
    db.orderItem.aggregate({
      _sum: { quantity: true },
      where: { order: activeWhere },
    }),
    db.product.findMany({ where: { sellerId: seller.id }, select: { avgRating: true } }),
    db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: { order: activeWhere },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const rated = ownProducts.filter((p) => p.avgRating > 0);
  const avgRating =
    rated.length > 0 ? rated.reduce((s, p) => s + p.avgRating, 0) / rated.length : 0;

  const productNames = await db.product.findMany({
    where: { id: { in: topGroups.map((g) => g.productId) } },
    select: { id: true, name: true, slug: true },
  });
  const nameById = new Map(productNames.map((p) => [p.id, p]));

  return ok({
    revenue: Number(revAgg._sum.total ?? 0),
    orders: orderCount,
    unitsSold: unitsAgg._sum.quantity ?? 0,
    avgRating: Math.round(avgRating * 10) / 10,
    productCount: ownProducts.length,
    topProducts: topGroups.map((g) => ({
      id: g.productId,
      name: nameById.get(g.productId)?.name ?? "Unknown",
      slug: nameById.get(g.productId)?.slug ?? "",
      unitsSold: g._sum.quantity ?? 0,
    })),
  });
});
