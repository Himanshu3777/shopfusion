import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

const patchSchema = z.object({
  quantity: z.number().int().min(1).max(99).optional(),
  savedForLater: z.boolean().optional(),
});

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const item = await db.cartItem.findFirst({
      where: { id, cart: { userId: user.id } },
      include: { product: true, variant: true },
    });
    if (!item) throw new ApiError(404, "Cart item not found");

    if (body.quantity != null) {
      if (!item.product.isActive)
        throw new ApiError(400, `"${item.product.name}" is no longer available`);
      const available = item.variant ? item.variant.stock : item.product.stock;
      if (body.quantity > available)
        throw new ApiError(400, `Only ${available} in stock for "${item.product.name}"`);
    }

    const updated = await db.cartItem.update({
      where: { id },
      data: {
        ...(body.quantity != null ? { quantity: body.quantity } : {}),
        ...(body.savedForLater != null ? { savedForLater: body.savedForLater } : {}),
      },
    });
    return ok(updated);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const item = await db.cartItem.findFirst({
      where: { id, cart: { userId: user.id } },
      select: { id: true },
    });
    if (!item) throw new ApiError(404, "Cart item not found");

    await db.cartItem.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
