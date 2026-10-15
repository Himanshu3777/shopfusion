import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { slugify } from "@/lib/utils";
import { uniqueCategorySlug } from "@/lib/catalog";

const categoryBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().url("Image must be a valid URL").max(500).optional().nullable(),
  parentId: z.string().min(1).optional().nullable(),
});

/** Public category tree: top-level parents with active children. */
export const GET = withErrorHandling(async () => {
  const parents = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  return ok(parents);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const body = categoryBodySchema.parse(await req.json());

  if (body.parentId) {
    const parent = await db.category.findUnique({ where: { id: body.parentId } });
    if (!parent) throw new ApiError(404, "Parent category not found");
  }

  const slug = await uniqueCategorySlug(slugify(body.name));
  const category = await db.category.create({
    data: {
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || null,
      image: body.image || null,
      parentId: body.parentId || null,
    },
  });
  return ok(category, 201);
});
