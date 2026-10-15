import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, notFound, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { couponUpsertSchema } from "@/lib/validation";

const partialCouponSchema = couponUpsertSchema.partial();

/** PATCH /api/admin/coupons/[id] — update a coupon. */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const body = partialCouponSchema.parse(await req.json());

    const coupon = await db.coupon.findUnique({ where: { id } });
    if (!coupon) return notFound("Coupon not found");

    let code = coupon.code;
    if (body.code && body.code.trim().toUpperCase() !== coupon.code) {
      code = body.code.trim().toUpperCase();
      if (await db.coupon.findUnique({ where: { code } })) {
        return fail(`Coupon code ${code} already exists`, 409);
      }
    }

    const updated = await db.coupon.update({
      where: { id },
      data: {
        code,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
        ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
        ...(body.minOrderValue !== undefined ? { minOrderValue: body.minOrderValue } : {}),
        ...(body.maxDiscount !== undefined ? { maxDiscount: body.maxDiscount } : {}),
        ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.validFrom !== undefined ? { validFrom: body.validFrom } : {}),
        ...(body.validUntil !== undefined ? { validUntil: body.validUntil } : {}),
      },
    });
    return ok(updated);
  }
);

/** DELETE /api/admin/coupons/[id] — delete a coupon. */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const coupon = await db.coupon.findUnique({ where: { id } });
    if (!coupon) return notFound("Coupon not found");
    await db.coupon.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
