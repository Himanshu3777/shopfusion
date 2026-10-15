import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, fail, notFound, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

const userUpdateSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  isBanned: z.boolean().optional(),
});

/** PATCH /api/admin/users/[id] — change role / ban toggle. */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = userUpdateSchema.parse(await req.json());

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");

    if (id === admin.id && body.isBanned === true) {
      return fail("You cannot ban your own admin account", 400);
    }
    if (id === admin.id && body.role && body.role !== "ADMIN") {
      return fail("You cannot remove your own admin role", 400);
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.isBanned !== undefined ? { isBanned: body.isBanned } : {}),
      },
      select: { id: true, name: true, email: true, role: true, isBanned: true },
    });
    return ok(updated);
  }
);

/** DELETE /api/admin/users/[id] — delete a user (never yourself). */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    if (id === admin.id) return fail("You cannot delete your own account", 400);
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");
    await db.user.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
