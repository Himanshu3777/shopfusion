import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, paginated, pageParams, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { productCardSelect } from "@/lib/selects";

/** GET /api/admin/products — all products with filters (q, category, brand, seller, isActive, isFeatured). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = pageParams(sp);
  const q = sp.get("q")?.trim();
  const category = sp.get("category");
  const brand = sp.get("brand");
  const seller = sp.get("seller");
  const isActive = sp.get("isActive");
  const isFeatured = sp.get("isFeatured");

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { categoryId: category } : {}),
    ...(brand ? { brandId: brand } : {}),
    ...(seller ? { sellerId: seller } : {}),
    ...(isActive === "true" ? { isActive: true } : isActive === "false" ? { isActive: false } : {}),
    ...(isFeatured === "true" ? { isFeatured: true } : isFeatured === "false" ? { isFeatured: false } : {}),
  };

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: productCardSelect,
    }),
  ]);

  return ok(paginated(items, total, page, limit));
});
