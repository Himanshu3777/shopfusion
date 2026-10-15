import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, notFound, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

const adminProductUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

/** PATCH /api/admin/products/[id] — toggle visibility / featured. */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const body = adminProductUpdateSchema.parse(await req.json());

    const product = await db.product.findUnique({ where: { id } });
    if (!product) return notFound("Product not found");

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
      },
    });
    return ok(updated);
  }
);

/** DELETE /api/admin/products/[id] — hard delete (blocked when order history exists). */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const product = await db.product.findUnique({ where: { id } });
    if (!product) return notFound("Product not found");

    const orderItems = await db.orderItem.count({ where: { productId: id } });
    if (orderItems > 0) {
      return fail("This product has order history and cannot be deleted. Deactivate it instead.", 400);
    }
    await db.product.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
