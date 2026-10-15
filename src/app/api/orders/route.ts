import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, pageParams, paginated } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams);

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { items: true } },
        seller: { select: { storeName: true, storeSlug: true } },
      },
    }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  return ok(paginated(orders, total, page, limit));
});
