import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, paginated, pageParams, withErrorHandling, ApiError } from "@/lib/api";
import { requireSeller } from "@/lib/rbac";

/** GET /api/seller/orders — orders belonging to the seller, paginated. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { seller } = await requireSeller();
  if (!seller) throw new ApiError(403, "Seller profile not found");

  const { page, limit, skip } = pageParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get("status");
  const where = { sellerId: seller.id, ...(status ? { status: status as never } : {}) };

  const [total, items] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: {
          include: { product: { select: { name: true, slug: true } } },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return ok(paginated(items, total, page, limit));
});
