import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, paginated, pageParams, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { couponUpsertSchema } from "@/lib/validation";

/** GET /api/admin/coupons — list coupons, paginated. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams);
  const [total, items] = await Promise.all([
    db.coupon.count(),
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
  ]);
  return ok(paginated(items, total, page, limit));
});

/** POST /api/admin/coupons — create a coupon (code normalized to uppercase). */
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const body = couponUpsertSchema.parse(await req.json());
  const code = body.code.trim().toUpperCase();

  if (await db.coupon.findUnique({ where: { code } })) {
    return fail(`Coupon code ${code} already exists`, 409);
  }

  const coupon = await db.coupon.create({
    data: {
      code,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minOrderValue: body.minOrderValue,
      maxDiscount: body.maxDiscount,
      usageLimit: body.usageLimit,
      isActive: body.isActive,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
    },
  });
  return ok(coupon, 201);
});
