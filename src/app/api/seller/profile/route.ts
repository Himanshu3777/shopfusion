import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, notFound, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

const profileUpdateSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  logo: z.string().url("Logo must be a valid URL").max(500).optional().nullable(),
});

/** GET /api/seller/profile — own seller profile (visible even while PENDING). */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const seller = await db.seller.findUnique({ where: { userId: user.id } });
  if (!seller) return notFound("Seller profile not found");
  return ok(seller);
});

/** PATCH /api/seller/profile — update own store details. */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const seller = await db.seller.findUnique({ where: { userId: user.id } });
  if (!seller) return notFound("Seller profile not found");

  const body = profileUpdateSchema.parse(await req.json());
  const data: { storeName?: string; description?: string | null; logo?: string | null } = {};
  if (body.storeName !== undefined) data.storeName = body.storeName;
  if (body.description !== undefined) data.description = body.description;
  if (body.logo !== undefined) data.logo = body.logo;

  const updated = await db.seller.update({ where: { id: seller.id }, data });
  return ok(updated);
});
