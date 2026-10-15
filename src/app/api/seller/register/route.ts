import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { slugify } from "@/lib/utils";

const sellerRegisterSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(100),
  description: z.string().max(1000).optional(),
  logo: z.string().url("Logo must be a valid URL").max(500).optional(),
});

/**
 * POST /api/seller/register — apply for a seller account.
 * Idempotent: returns the existing profile if one already exists.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();

  const existing = await db.seller.findUnique({ where: { userId: user.id } });
  if (existing) return ok(existing);

  const body = sellerRegisterSchema.parse(await req.json());

  const base = slugify(body.storeName) || `store-${user.id.slice(0, 8).toLowerCase()}`;
  let storeSlug = base;
  let n = 1;
  while (await db.seller.findUnique({ where: { storeSlug } })) {
    n += 1;
    storeSlug = `${base}-${n}`;
  }

  const seller = await db.$transaction(async (tx) => {
    const created = await tx.seller.create({
      data: {
        userId: user.id,
        storeName: body.storeName,
        storeSlug,
        description: body.description,
        logo: body.logo,
        status: "PENDING",
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { role: "SELLER" } });
    return created;
  });

  return ok(seller, 201);
});
