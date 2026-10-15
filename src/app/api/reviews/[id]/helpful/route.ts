import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

export const POST = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await params;

    const review = await db.review.findUnique({ where: { id } });
    if (!review) throw new ApiError(404, "Review not found");

    const updated = await db.review.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
      select: { id: true, helpfulCount: true },
    });
    return ok(updated);
  }
);
