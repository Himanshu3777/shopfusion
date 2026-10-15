import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { addressSchema } from "@/lib/validation";

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const body = addressSchema.partial().parse(await req.json());

    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new ApiError(404, "Address not found");

    const updated = await db.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.address.updateMany({
          where: { userId: user.id, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data: body });
    });
    return ok(updated);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new ApiError(404, "Address not found");

    await db.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        // Promote the most recently created remaining address to default.
        const next = await tx.address.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });

    return ok({ deleted: true });
  }
);
