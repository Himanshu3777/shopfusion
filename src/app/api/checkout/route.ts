import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { checkoutSchema } from "@/lib/validation";
import {
  effectivePrice,
  validateCoupon,
  couponDiscount,
  shippingFeeFor,
  formatINR,
  type CouponLike,
} from "@/lib/pricing";
import {
  gatewayFor,
  configuredProvider,
  createRazorpayOrder,
  razorpayConfigured,
  razorpayPublicKey,
} from "@/lib/payments";
import { orderConfirmationMail } from "@/lib/email";
import { pushHistory } from "@/lib/orders";
import type { Prisma } from "@prisma/client";

function genOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SF-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

type DbCoupon = Prisma.CouponGetPayload<Record<string, never>>;

function toCouponLike(c: DbCoupon): CouponLike {
  return {
    code: c.code,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    minOrderValue: c.minOrderValue != null ? Number(c.minOrderValue) : null,
    maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
    isActive: c.isActive,
    validFrom: c.validFrom,
    validUntil: c.validUntil,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
  };
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = checkoutSchema.parse(await req.json());
  const isCOD = body.paymentProvider === "COD";
  const isRazorpay = body.paymentProvider === "RAZORPAY";
  if (isRazorpay && !razorpayConfigured()) {
    throw new ApiError(503, "Online payment is not set up yet. Please choose Cash on Delivery.");
  }

  // 1. Address (own only) — snapshot onto each order.
  const address = await db.address.findFirst({
    where: { id: body.addressId, userId: user.id },
  });
  if (!address) throw new ApiError(404, "Address not found");

  // 2. Cart — only active (non-saved-for-later) items.
  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        where: { savedForLater: false },
        include: { product: true, variant: true },
      },
    },
  });
  const cartItems = cart?.items ?? [];
  if (cartItems.length === 0) throw new ApiError(400, "Your cart is empty");

  // 3. Server-side price + stock validation per line.
  type Line = {
    itemId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    sellerId: string;
    unitPrice: number;
    lineSubtotal: number;
    productName: string;
    sku: string;
  };
  const lines: Line[] = [];
  for (const item of cartItems) {
    const p = item.product;
    if (!p || !p.isActive)
      throw new ApiError(400, `"${p?.name ?? "A product"}" is no longer available`);

    let unitPrice = effectivePrice(
      Number(p.price),
      p.discountPrice != null ? Number(p.discountPrice) : null
    );
    let sku = p.sku;

    if (item.variantId) {
      const v = item.variant;
      if (!v || v.productId !== p.id || !v.isActive)
        throw new ApiError(400, `A selected variant of "${p.name}" is no longer available`);
      if (v.price != null) unitPrice = Number(v.price);
      sku = v.sku;
      if (item.quantity > v.stock)
        throw new ApiError(400, `Only ${v.stock} in stock for "${p.name} (${v.name})"`);
    } else if (item.quantity > p.stock) {
      throw new ApiError(400, `Only ${p.stock} in stock for "${p.name}"`);
    }

    lines.push({
      itemId: item.id,
      productId: p.id,
      variantId: item.variantId,
      quantity: item.quantity,
      sellerId: p.sellerId,
      unitPrice,
      lineSubtotal: unitPrice * item.quantity,
      productName: p.name,
      sku,
    });
  }

  const cartSubtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);

  // 4. Coupon validation (server-side, never trusted from client).
  let couponDb: DbCoupon | null = null;
  let coupon: CouponLike | null = null;
  if (body.couponCode) {
    couponDb = await db.coupon.findFirst({
      where: { code: { equals: body.couponCode.trim(), mode: "insensitive" } },
    });
    if (!couponDb) throw new ApiError(400, "Invalid coupon code");
    coupon = toCouponLike(couponDb);
    const err = validateCoupon(coupon, cartSubtotal);
    if (err) throw new ApiError(400, err);
  }
  const totalDiscount = coupon ? couponDiscount(cartSubtotal, coupon) : 0;

  // 5. Group lines by seller — ONE order per seller.
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const g = groups.get(line.sellerId);
    if (g) g.push(line);
    else groups.set(line.sellerId, [line]);
  }
  const groupEntries = [...groups.entries()];

  type OrderInput = {
    sellerId: string;
    lines: Line[];
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
  };
  const orderInputs: OrderInput[] = [];
  let allocated = 0;
  groupEntries.forEach(([sellerId, glines], idx) => {
    const gSubtotal = glines.reduce((s, l) => s + l.lineSubtotal, 0);
    // Proportional coupon split; last order absorbs rounding remainder.
    const share =
      cartSubtotal > 0
        ? idx === groupEntries.length - 1
          ? totalDiscount - allocated
          : Math.round((totalDiscount * gSubtotal) / cartSubtotal)
        : 0;
    allocated += share;
    const afterDiscount = gSubtotal - share;
    const shippingFee = shippingFeeFor(afterDiscount); // free ≥ ₹499 else ₹49, per order
    const total = Math.max(0, afterDiscount + shippingFee); // tax: 0
    orderInputs.push({ sellerId, lines: glines, subtotal: gSubtotal, discount: share, shippingFee, total });
  });

  // 6. Single transaction: orders + items + payments + notifications, stock
  //    decrement, coupon usedCount++ (once), clear purchased cart items.
  const createdOrders = await db.$transaction(async (tx) => {
    const created: { id: string; orderNumber: string; total: number }[] = [];
    for (const inp of orderInputs) {
      const order = await tx.order.create({
        data: {
          orderNumber: genOrderNumber(),
          userId: user.id,
          sellerId: inp.sellerId,
          status: "PENDING",
          paymentStatus: "PENDING",
          shipName: address.fullName,
          shipPhone: address.phone,
          shipLine1: address.line1,
          shipLine2: address.line2,
          shipCity: address.city,
          shipState: address.state,
          shipPostalCode: address.postalCode,
          shipCountry: address.country,
          subtotal: inp.subtotal,
          discount: inp.discount,
          shippingFee: inp.shippingFee,
          tax: 0,
          total: inp.total,
          couponId: couponDb?.id ?? null,
          couponCode: coupon?.code ?? null,
          statusHistory: pushHistory(null, "PENDING", "Order placed"),
          items: {
            create: inp.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.productName,
              sku: l.sku,
              price: l.unitPrice,
              quantity: l.quantity,
            })),
          },
        },
      });
      await tx.payment.create({
        data: {
          orderId: order.id,
          // NOTE: COD is recorded as MOCK provider + mode marker (no DB enum
          // change needed). Detect via isCODPayment() in src/lib/payments.ts.
          provider: isRazorpay ? "RAZORPAY" : "MOCK",
          amount: inp.total,
          currency: "INR",
          // COD / Razorpay stay PENDING until cash collected / online verified.
          status: "PENDING",
          rawResponse: isCOD
            ? { mode: "cod", note: "Cash on Delivery — collect on handover" }
            : isRazorpay
              ? { mode: "razorpay", note: "Awaiting online payment" }
              : undefined,
        },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Order confirmed",
          body: isCOD
            ? `Order ${order.orderNumber} (${formatINR(inp.total)}) is confirmed. Pay ${formatINR(inp.total)} in cash on delivery.`
            : `Order ${order.orderNumber} (${formatINR(inp.total)}) is confirmed.`,
          type: "order",
        },
      });
      created.push({ id: order.id, orderNumber: order.orderNumber, total: inp.total });
    }

    for (const l of lines) {
      await tx.product.update({
        where: { id: l.productId },
        data: { stock: { decrement: l.quantity } },
      });
      if (l.variantId) {
        await tx.productVariant.update({
          where: { id: l.variantId },
          data: { stock: { decrement: l.quantity } },
        });
      }
    }

    if (couponDb) {
      await tx.coupon.update({
        where: { id: couponDb.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({
      where: { id: { in: lines.map((l) => l.itemId) } },
    });

    return created;
  });

  // 7. Payment handling per method, then email.
  const results: { id: string; orderNumber: string; total: number; paymentProvider: string }[] = [];
  let razorpay: { keyId: string; orderId: string; amount: number; currency: string } | null = null;

  if (isRazorpay) {
    // Create ONE Razorpay order for the grand total; client completes it via
    // Razorpay Checkout (UPI / cards / netbanking), then calls /api/checkout/verify.
    const grandTotal = createdOrders.reduce((s, o) => s + o.total, 0);
    const receipt = createdOrders.map((o) => o.orderNumber).join(",").slice(0, 40);
    const rpOrder = await createRazorpayOrder(grandTotal, receipt || `SF-${Date.now()}`, {
      customer: user.email ?? "",
    });
    for (const o of createdOrders) {
      await db.payment.update({
        where: { orderId: o.id },
        data: {
          rawResponse: {
            mode: "razorpay",
            razorpayOrderId: rpOrder.id,
            note: "Awaiting online payment",
          },
        },
      });
    }
    razorpay = {
      keyId: razorpayPublicKey(),
      orderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
    };
  } else if (!isCOD) {
    // MOCK: charge via the configured gateway (auto PAID).
    const gateway = gatewayFor(configuredProvider());
    for (const o of createdOrders) {
      try {
        const intent = await gateway.charge({
          orderId: o.id,
          orderNumber: o.orderNumber,
          amount: o.total,
          currency: "INR",
          customerEmail: user.email,
        });
        await db.payment.update({
          where: { orderId: o.id },
          data: {
            status: intent.status,
            providerPaymentId: intent.providerPaymentId,
            provider: gateway.name,
            rawResponse: intent.raw as unknown as Prisma.InputJsonValue,
          },
        });
        if (intent.status === "PAID") {
          await db.order.update({ where: { id: o.id }, data: { paymentStatus: "PAID" } });
        }
      } catch (e) {
        await db.payment.update({
          where: { orderId: o.id },
          data: {
            status: "FAILED",
            rawResponse: { error: e instanceof Error ? e.message : "Payment failed" },
          },
        });
      }
    }
  }
  // COD skips online charge entirely — cash is collected on delivery.

  for (const o of createdOrders) {
    // Send confirmation email now for COD/MOCK; for Razorpay after verification.
    if (!isRazorpay) {
      try {
        await orderConfirmationMail(
          user.email,
          o.orderNumber,
          formatINR(o.total),
          isCOD ? "Pay in cash when your order arrives." : undefined
        );
      } catch (e) {
        console.error("[checkout] confirmation email failed", e);
      }
    }
    results.push({ ...o, paymentProvider: isCOD ? "COD" : isRazorpay ? "RAZORPAY" : "MOCK" });
  }

  return ok({ orders: results, razorpay }, 201);
});
