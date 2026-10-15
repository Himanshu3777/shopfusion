import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { cartItemSchema } from "@/lib/validation";
import {
  calcTotals,
  effectivePrice,
  validateCoupon,
  couponDiscount,
  type CouponLike,
} from "@/lib/pricing";
import { productCardSelect } from "@/lib/selects";
import type { Prisma } from "@prisma/client";

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

const variantSelect = {
  id: true,
  name: true,
  sku: true,
  price: true,
  stock: true,
  attributes: true,
} as const;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const couponCode = req.nextUrl.searchParams.get("coupon")?.trim() || null;

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: { select: productCardSelect },
          variant: { select: variantSelect },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const items = (cart?.items ?? []).map((item) => {
    const unitPrice =
      item.variant?.price != null
        ? Number(item.variant.price)
        : effectivePrice(
            Number(item.product.price),
            item.product.discountPrice != null ? Number(item.product.discountPrice) : null
          );
    return { ...item, unitPrice, lineTotal: unitPrice * item.quantity };
  });

  // Summary is computed over active (non-saved) lines only.
  const lines = items
    .filter((i) => !i.savedForLater)
    .map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity }));
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  // Coupon preview — validated but never persisted.
  let coupon: CouponLike | null = null;
  let couponMessage: string | null = null;
  if (couponCode) {
    const dbCoupon = await db.coupon.findFirst({
      where: { code: { equals: couponCode, mode: "insensitive" } },
    });
    if (!dbCoupon) {
      couponMessage = "Invalid coupon code";
    } else {
      const like = toCouponLike(dbCoupon);
      const err = validateCoupon(like, subtotal);
      if (err) {
        couponMessage = err;
      } else {
        coupon = like;
      }
    }
  }

  const summary = calcTotals(lines, coupon);
  return ok({
    items,
    summary,
    coupon: coupon
      ? { code: coupon.code, discount: couponDiscount(subtotal, coupon), message: null as string | null }
      : { code: couponCode, discount: 0, message: couponMessage },
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = cartItemSchema.parse(await req.json());

  const product = await db.product.findUnique({ where: { id: body.productId } });
  if (!product) throw new ApiError(404, "Product not found");
  if (!product.isActive) throw new ApiError(400, "This product is not available");

  let variant: Prisma.ProductVariantGetPayload<Record<string, never>> | null = null;
  if (body.variantId) {
    variant = await db.productVariant.findUnique({ where: { id: body.variantId } });
    if (!variant || variant.productId !== product.id)
      throw new ApiError(404, "Variant not found");
    if (!variant.isActive) throw new ApiError(400, "This variant is not available");
  }

  const cart = await db.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  const existing = await db.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: body.productId,
      variantId: body.variantId ?? null,
    },
  });

  const newQty = (existing?.quantity ?? 0) + body.quantity;
  const available = variant ? variant.stock : product.stock;
  if (newQty > available)
    throw new ApiError(400, `Only ${available} in stock for "${product.name}"`);

  const item = existing
    ? await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, savedForLater: false },
      })
    : await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId: body.productId,
          variantId: body.variantId ?? null,
          quantity: body.quantity,
        },
      });

  return ok(item, 201);
});
