import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { productCardSelect } from "@/lib/selects";

const postSchema = z.object({ productId: z.string().min(1) });

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const wishlist = await db.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: { product: { select: productCardSelect } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return ok({ items: wishlist?.items ?? [] });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const { productId } = postSchema.parse(await req.json());

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, "Product not found");
  if (!product.isActive) throw new ApiError(400, "This product is not available");

  const wishlist = await db.wishlist.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  const existing = await db.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
  });
  if (existing) return ok(existing); // idempotent

  const item = await db.wishlistItem.create({
    data: { wishlistId: wishlist.id, productId },
  });
  return ok(item, 201);
});
