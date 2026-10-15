import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { verifyRazorpaySignature } from "@/lib/payments";
import { orderConfirmationMail } from "@/lib/email";
import { formatINR } from "@/lib/pricing";
import type { Prisma } from "@prisma/client";

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  orderIds: z.array(z.string().min(1)).min(1).max(20),
});

/**
 * POST /api/checkout/verify — confirm a Razorpay online payment.
 * Verifies the HMAC signature server-side, then marks payments PAID.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = verifySchema.parse(await req.json());

  const valid = verifyRazorpaySignature(
    body.razorpayOrderId,
    body.razorpayPaymentId,
    body.razorpaySignature
  );
  if (!valid) throw new ApiError(400, "Payment verification failed. Please try again.");

  // Only touch this user's own pending Razorpay orders.
  const orders = await db.order.findMany({
    where: {
      id: { in: body.orderIds },
      userId: user.id,
      payment: { provider: "RAZORPAY", status: "PENDING" },
    },
    include: { payment: true },
  });
  if (orders.length === 0) throw new ApiError(404, "No pending orders found for this payment.");

  // Ensure the Razorpay order id matches what we created.
  for (const o of orders) {
    const raw = (o.payment?.rawResponse ?? {}) as Record<string, unknown>;
    if (raw["razorpayOrderId"] !== body.razorpayOrderId) {
      throw new ApiError(400, "Payment does not match these orders.");
    }
  }

  for (const o of orders) {
    await db.payment.update({
      where: { orderId: o.id },
      data: {
        status: "PAID",
        providerPaymentId: body.razorpayPaymentId,
        rawResponse: {
          mode: "razorpay",
          razorpayOrderId: body.razorpayOrderId,
          razorpayPaymentId: body.razorpayPaymentId,
          note: "Paid online via Razorpay",
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await db.order.update({
      where: { id: o.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    });
    try {
      await orderConfirmationMail(user.email, o.orderNumber, formatINR(Number(o.total)));
    } catch (e) {
      console.error("[checkout/verify] confirmation email failed", e);
    }
  }

  return ok({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total),
      paymentProvider: "RAZORPAY",
    })),
  });
});
