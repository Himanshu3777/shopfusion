import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, paginated, pageParams, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

/** GET /api/admin/reviews — all reviews (paginated, with product + user). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = pageParams(sp);
  const productId = sp.get("productId");

  const where = productId ? { productId } : {};
  const [total, items] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return ok(paginated(items, total, page, limit));
});
