import { NextRequest } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, paginated, pageParams, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

/** GET /api/admin/orders — all orders (status filter, order-number search, paginated). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = pageParams(sp);
  const status = sp.get("status")?.toUpperCase();
  const q = sp.get("q")?.trim();

  const where = {
    ...(status && (STATUSES as string[]).includes(status) ? { status: status as OrderStatus } : {}),
    ...(q ? { orderNumber: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, items] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, storeName: true, storeSlug: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return ok(paginated(items, total, page, limit));
});
