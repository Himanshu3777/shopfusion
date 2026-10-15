import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, paginated, pageParams, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

const ROLES: Role[] = ["CUSTOMER", "SELLER", "ADMIN"];

/** GET /api/admin/users — list users (search q, role filter, paginated). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = pageParams(sp);
  const q = sp.get("q")?.trim();
  const role = sp.get("role")?.toUpperCase();

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role && (ROLES as string[]).includes(role) ? { role: role as Role } : {}),
  };

  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  return ok(paginated(items, total, page, limit));
});
