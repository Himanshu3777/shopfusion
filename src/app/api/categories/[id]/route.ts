import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { slugify } from "@/lib/utils";
import { uniqueCategorySlug } from "@/lib/catalog";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().url().max(500).optional().nullable(),
  parentId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const category = await db.category.findUnique({
    where: { id },
    include: {
      children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });
  if (!category) throw new ApiError(404, "Category not found");
  return ok(category);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Category not found");

  const body = patchSchema.parse(await req.json());
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    data.name = body.name.trim();
    const base = body.slug ? slugify(body.slug) : slugify(body.name);
    data.slug = await uniqueCategorySlug(base, id);
  } else if (body.slug !== undefined) {
    data.slug = await uniqueCategorySlug(slugify(body.slug), id);
  }
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.image !== undefined) data.image = body.image || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  if (body.parentId !== undefined) {
    if (body.parentId === id) throw new ApiError(400, "A category cannot be its own parent");
    if (body.parentId) {
      const parent = await db.category.findUnique({ where: { id: body.parentId } });
      if (!parent) throw new ApiError(404, "Parent category not found");
      // Cycle check: walk up from the new parent; it must never reach this category.
      let ancestorId: string | null = body.parentId;
      const seen = new Set<string>();
      while (ancestorId && !seen.has(ancestorId)) {
        seen.add(ancestorId);
        if (ancestorId === id) throw new ApiError(400, "Cannot move a category under its own descendant");
        const ancestor: { parentId: string | null } | null = await db.category.findUnique({
          where: { id: ancestorId },
          select: { parentId: true },
        });
        ancestorId = ancestor?.parentId ?? null;
      }
    }
    data.parentId = body.parentId || null;
  }

  const category = await db.category.update({ where: { id }, data });
  return ok(category);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const existing = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!existing) throw new ApiError(404, "Category not found");
  if (existing._count.products > 0) {
    throw new ApiError(409, `Cannot delete category with ${existing._count.products} product(s). Move them first.`);
  }
  // Reparent children to top level, then delete.
  await db.category.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await db.category.delete({ where: { id } });
  return ok({ deleted: true, id });
});
