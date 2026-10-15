import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { productCardSelect } from "@/lib/selects";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const order = await db.order.findFirst({
      where: { id, userId: user.id },
      include: {
        items: {
          include: {
            product: { select: productCardSelect },
            variant: {
              select: { id: true, name: true, sku: true, attributes: true },
            },
          },
        },
        payment: true,
        seller: { select: { storeName: true, storeSlug: true } },
      },
    });
    if (!order) throw new ApiError(404, "Order not found");

    return ok(order);
  }
);
