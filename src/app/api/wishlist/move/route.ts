import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

const moveSchema = z.object({ productId: z.string().min(1) });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const { productId } = moveSchema.parse(await req.json());

  const wishlistItem = await db.wishlistItem.findFirst({
    where: { productId, wishlist: { userId: user.id } },
    include: { product: true },
  });
  if (!wishlistItem) throw new ApiError(404, "Item not found in wishlist");

  const product = wishlistItem.product;
  if (!product.isActive) throw new ApiError(400, "This product is not available");
  if (product.stock < 1) throw new ApiError(400, `"${product.name}" is out of stock`);

  const cartItem = await db.$transaction(async (tx) => {
    await tx.wishlistItem.delete({ where: { id: wishlistItem.id } });

    const cart = await tx.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: null },
    });
    const newQty = (existing?.quantity ?? 0) + 1;
    if (newQty > product.stock)
      throw new ApiError(400, `Only ${product.stock} in stock for "${product.name}"`);

    return existing
      ? await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQty, savedForLater: false },
        })
      : await tx.cartItem.create({
          data: { cartId: cart.id, productId, quantity: 1 },
        });
  });

  return ok(cartItem, 201);
});
