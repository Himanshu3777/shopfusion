import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { validateCoupon, couponDiscount, type CouponLike } from "@/lib/pricing";

const validateSchema = z.object({
  code: z.string().min(1).max(30),
  subtotal: z.number().nonnegative(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireUser();
  const { code, subtotal } = validateSchema.parse(await req.json());

  const dbCoupon = await db.coupon.findFirst({
    where: { code: { equals: code.trim(), mode: "insensitive" } },
  });
  if (!dbCoupon) return ok({ valid: false, discount: 0, message: "Invalid coupon code" });

  const coupon: CouponLike = {
    code: dbCoupon.code,
    discountType: dbCoupon.discountType,
    discountValue: Number(dbCoupon.discountValue),
    minOrderValue: dbCoupon.minOrderValue != null ? Number(dbCoupon.minOrderValue) : null,
    maxDiscount: dbCoupon.maxDiscount != null ? Number(dbCoupon.maxDiscount) : null,
    isActive: dbCoupon.isActive,
    validFrom: dbCoupon.validFrom,
    validUntil: dbCoupon.validUntil,
    usageLimit: dbCoupon.usageLimit,
    usedCount: dbCoupon.usedCount,
  };

  const err = validateCoupon(coupon, subtotal);
  if (err) return ok({ valid: false, discount: 0, message: err });

  return ok({
    valid: true,
    discount: couponDiscount(subtotal, coupon),
    message: `Coupon ${coupon.code} applied`,
  });
});
