import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { createRazorpayOrder, razorpayConfigured, razorpayPublicKey } from "@/lib/payments";
import type { Prisma } from "@prisma/client";

const schema = z.object({ orderId: z.string().min(1) });

/**
 * POST /api/orders/retry-payment — create a fresh Razorpay order for a
 * pending online payment so the buyer can complete it from the order page.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const { orderId } = schema.parse(await req.json());

  if (!razorpayConfigured()) {
    throw new ApiError(503, "Online payment is not set up yet.");
  }

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payment: true },
  });
  if (!order?.payment) throw new ApiError(404, "Order not found");
  if (order.payment.provider !== "RAZORPAY") {
    throw new ApiError(400, "This order is not an online payment order.");
  }
  if (order.payment.status === "PAID") {
    throw new ApiError(400, "This order is already paid.");
  }
  if (order.status === "CANCELLED") {
    throw new ApiError(400, "This order was cancelled.");
  }

  const rpOrder = await createRazorpayOrder(Number(order.total), order.orderNumber, {
    customer: user.email ?? "",
  });
  await db.payment.update({
    where: { orderId: order.id },
    data: {
      rawResponse: {
        mode: "razorpay",
        razorpayOrderId: rpOrder.id,
        note: "Awaiting online payment (retry)",
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return ok({
    keyId: razorpayPublicKey(),
    orderId: rpOrder.id,
    amount: rpOrder.amount,
    currency: rpOrder.currency,
  });
});
