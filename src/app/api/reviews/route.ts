import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError, pageParams, paginated } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { reviewUpsertSchema } from "@/lib/validation";

async function recomputeRating(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await db.product.update({
    where: { id: productId },
    data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count._all },
  });
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) throw new ApiError(400, "productId is required");
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams);

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { name: true } } },
    }),
    db.review.count({ where: { productId } }),
  ]);

  return ok(paginated(reviews, total, page, limit));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = reviewUpsertSchema.parse(await req.json());

  const product = await db.product.findUnique({ where: { id: body.productId } });
  if (!product) throw new ApiError(404, "Product not found");

  // Verified purchase: a DELIVERED order containing this product.
  const deliveredItem = await db.orderItem.findFirst({
    where: {
      productId: body.productId,
      order: { userId: user.id, status: "DELIVERED" },
    },
    select: { orderId: true },
  });
  if (!deliveredItem)
    throw new ApiError(403, "Only verified purchasers can review");

  // Simple anti-spam: no more than 3 reviews per user in 10 minutes.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentCount = await db.review.count({
    where: { userId: user.id, createdAt: { gte: tenMinutesAgo } },
  });
  if (recentCount > 3)
    throw new ApiError(429, "You're reviewing too fast. Please wait a few minutes.");

  const review = await db.review.upsert({
    where: { productId_userId: { productId: body.productId, userId: user.id } },
    create: {
      productId: body.productId,
      userId: user.id,
      orderId: deliveredItem.orderId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      isVerifiedPurchase: true,
    },
    update: {
      rating: body.rating,
      title: body.title,
      body: body.body,
      orderId: deliveredItem.orderId,
      isVerifiedPurchase: true,
    },
    include: { user: { select: { name: true } } },
  });

  await recomputeRating(body.productId);
  return ok(review, 201);
});
