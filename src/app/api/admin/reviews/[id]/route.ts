import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, notFound, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

/** DELETE /api/admin/reviews/[id] — remove a review and recompute product rating. */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const review = await db.review.findUnique({ where: { id } });
    if (!review) return notFound("Review not found");

    const productId = review.productId;
    await db.review.delete({ where: { id } });

    const agg = await db.review.aggregate({
      _avg: { rating: true },
      _count: true,
      where: { productId },
    });
    await db.product.update({
      where: { id: productId },
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });

    return ok({ deleted: true });
  }
);
