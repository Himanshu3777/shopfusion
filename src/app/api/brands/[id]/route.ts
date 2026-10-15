import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { slugify } from "@/lib/utils";
import { uniqueBrandSlug } from "@/lib/catalog";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(120).optional(),
  logo: z.string().url().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new ApiError(404, "Brand not found");
  return ok(brand);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const existing = await db.brand.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Brand not found");

  const body = patchSchema.parse(await req.json());
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    data.name = body.name.trim();
    const base = body.slug ? slugify(body.slug) : slugify(body.name);
    data.slug = await uniqueBrandSlug(base, id);
  } else if (body.slug !== undefined) {
    data.slug = await uniqueBrandSlug(slugify(body.slug), id);
  }
  if (body.logo !== undefined) data.logo = body.logo || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const brand = await db.brand.update({ where: { id }, data });
  return ok(brand);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const existing = await db.brand.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Brand not found");
  // Products keep living with brandId set to null (onDelete: SetNull).
  await db.brand.delete({ where: { id } });
  return ok({ deleted: true, id });
});
