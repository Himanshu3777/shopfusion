import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

/** GET /api/admin/analytics — platform-wide metrics. */
export const GET = withErrorHandling(async () => {
  await requireRole("ADMIN");

  const [revAgg, totalOrders, totalUsers, sellerGroups, pendingOrders, bestGroups] =
    await Promise.all([
      db.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "CANCELLED" } },
      }),
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
    ]);

  const sellerCounts = Object.fromEntries(sellerGroups.map((g) => [g.status, g._count]));
  const bestProducts = await db.product.findMany({
    where: { id: { in: bestGroups.map((g) => g.productId) } },
    select: { id: true, name: true, slug: true },
  });
  const nameById = new Map(bestProducts.map((p) => [p.id, p]));

  return ok({
    totalRevenue: Number(revAgg._sum.total ?? 0),
    totalOrders,
    totalUsers,
    totalSellers: sellerGroups.reduce((s, g) => s + g._count, 0),
    sellersByStatus: sellerCounts,
    pendingOrders,
    bestSellers: bestGroups.map((g) => ({
      id: g.productId,
      name: nameById.get(g.productId)?.name ?? "Unknown",
      slug: nameById.get(g.productId)?.slug ?? "",
      unitsSold: g._sum.quantity ?? 0,
    })),
  });
});
