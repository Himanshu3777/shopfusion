import { NextRequest } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, fail, notFound, withErrorHandling, ApiError } from "@/lib/api";
import { requireSeller } from "@/lib/rbac";
import { canTransition, pushHistory, ORDER_STATUS_LABELS, type StatusEvent } from "@/lib/orders";

const orderStatusSchema = z.object({ status: z.nativeEnum(OrderStatus) });

/** PATCH /api/seller/orders/[id] — transition own order's status + notify buyer. */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { seller } = await requireSeller();
    if (!seller) throw new ApiError(403, "Seller profile not found");
    const { id } = await params;
    const { status } = orderStatusSchema.parse(await req.json());

    const order = await db.order.findFirst({ where: { id, sellerId: seller.id } });
    if (!order) return notFound("Order not found");
    if (order.status === status) return ok(order);
    if (!canTransition(order.status, status)) {
      return fail(`Cannot transition order from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[status]}`, 400);
    }

    const history = pushHistory(order.statusHistory as StatusEvent[] | null, status);

    const updated = await db.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: { status, statusHistory: history },
      });
      await tx.notification.create({
        data: {
          userId: o.userId,
          title: `Order ${o.orderNumber} is now ${ORDER_STATUS_LABELS[status]}`,
          body: `Your order from ${seller.storeName} has been updated to ${ORDER_STATUS_LABELS[status]}.`,
          type: "order",
        },
      });
      return o;
    });

    return ok(updated);
  }
);
