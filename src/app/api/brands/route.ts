import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { slugify } from "@/lib/utils";
import { uniqueBrandSlug } from "@/lib/catalog";

const brandBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  logo: z.string().url("Logo must be a valid URL").max(500).optional().nullable(),
});

/** Public brand list (active only). */
export const GET = withErrorHandling(async () => {
  const brands = await db.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return ok(brands);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const body = brandBodySchema.parse(await req.json());
  const slug = await uniqueBrandSlug(slugify(body.name));
  const brand = await db.brand.create({
    data: { name: body.name.trim(), slug, logo: body.logo || null },
  });
  return ok(brand, 201);
});
