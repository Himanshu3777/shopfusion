import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

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

const patchSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(5000).optional().nullable(),
});

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const existing = await db.review.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new ApiError(404, "Review not found");

    const updated = await db.review.update({
      where: { id },
      data: {
        ...(body.rating != null ? { rating: body.rating } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
      },
      include: { user: { select: { name: true } } },
    });

    await recomputeRating(existing.productId);
    return ok(updated);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const existing = await db.review.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new ApiError(404, "Review not found");

    await db.review.delete({ where: { id } });
    await recomputeRating(existing.productId);
    return ok({ deleted: true });
  }
);
