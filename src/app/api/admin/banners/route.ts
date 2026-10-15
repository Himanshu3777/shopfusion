import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";

export const bannerUpsertSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  subtitle: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url("Image URL must be valid").max(500).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  position: z.string().max(50).default("home-hero"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

/** GET /api/admin/banners — all banners ordered by position/sortOrder. */
export const GET = withErrorHandling(async () => {
  await requireRole("ADMIN");
  const items = await db.banner.findMany({ orderBy: [{ position: "asc" }, { sortOrder: "asc" }] });
  return ok(items);
});

/** POST /api/admin/banners — create a banner. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const body = bannerUpsertSchema.parse(await req.json());
  const banner = await db.banner.create({
    data: {
      title: body.title,
      subtitle: body.subtitle,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl,
      position: body.position,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    },
  });
  return ok(banner, 201);
});
