import { NextRequest } from "next/server";
import { z } from "zod";
import { SellerStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, notFound, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

const sellerStatusSchema = z.object({
  status: z.enum([SellerStatus.APPROVED, SellerStatus.REJECTED, SellerStatus.SUSPENDED]),
});

/** PATCH /api/admin/sellers/[id] — approve / reject / suspend a seller + notify them. */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const { status } = sellerStatusSchema.parse(await req.json());

    const seller = await db.seller.findUnique({ where: { id } });
    if (!seller) return notFound("Seller not found");

    const updated = await db.$transaction(async (tx) => {
      const s = await tx.seller.update({ where: { id }, data: { status } });
      const message =
        status === "APPROVED"
          ? `Your store "${seller.storeName}" has been approved. You can now list products.`
          : status === "REJECTED"
            ? `Your seller application for "${seller.storeName}" was not approved. Contact support for details.`
            : `Your store "${seller.storeName}" has been suspended. Contact support for details.`;
      await tx.notification.create({
        data: {
          userId: seller.userId,
          title: `Seller application ${status.toLowerCase()}`,
          body: message,
          type: "seller",
        },
      });
      return s;
    });

    return ok(updated);
  }
);
