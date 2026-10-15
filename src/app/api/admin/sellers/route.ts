import { NextRequest } from "next/server";
import type { SellerStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, paginated, pageParams, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

const STATUSES: SellerStatus[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

/** GET /api/admin/sellers — list sellers (status filter, paginated). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = pageParams(sp);
  const status = sp.get("status")?.toUpperCase();
  const q = sp.get("q")?.trim();

  const where = {
    ...(status && (STATUSES as string[]).includes(status) ? { status: status as SellerStatus } : {}),
    ...(q ? { storeName: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, items] = await Promise.all([
    db.seller.count({ where }),
    db.seller.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, isBanned: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
  ]);

  return ok(paginated(items, total, page, limit));
});
