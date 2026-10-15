import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const item = await db.wishlistItem.findFirst({
      where: { id, wishlist: { userId: user.id } },
      select: { id: true },
    });
    if (!item) throw new ApiError(404, "Wishlist item not found");

    await db.wishlistItem.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
