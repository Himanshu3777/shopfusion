import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { canTransition, pushHistory, ORDER_STATUS_LABELS } from "@/lib/orders";

export const POST = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const order = await db.order.findFirst({
      where: { id, userId: user.id },
      include: { items: true, payment: true },
    });
    if (!order) throw new ApiError(404, "Order not found");

    if (!canTransition(order.status, "CANCELLED"))
      throw new ApiError(
        400,
        `Order cannot be cancelled while it is ${ORDER_STATUS_LABELS[order.status]}`
      );

    const updated = await db.$transaction(async (tx) => {
      // Restock every item (product + variant).
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Payment note recording the cancellation.
      if (order.payment) {
        const raw =
          order.payment.rawResponse && typeof order.payment.rawResponse === "object"
            ? (order.payment.rawResponse as Record<string, unknown>)
            : {};
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            rawResponse: {
              ...raw,
              cancelledAt: new Date().toISOString(),
              note: "Order cancelled by customer",
            },
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          statusHistory: pushHistory(
            order.statusHistory as { status: typeof order.status; at: string; note?: string }[] | null,
            "CANCELLED",
            "Cancelled by customer"
          ),
        },
      });
    });

    return ok(updated);
  }
);
