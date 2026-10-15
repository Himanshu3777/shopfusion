import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, notFound, withErrorHandling } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { bannerUpsertSchema } from "../route";

/** PATCH /api/admin/banners/[id] — update a banner. */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const body = bannerUpsertSchema.partial().parse(await req.json());

    const banner = await db.banner.findUnique({ where: { id } });
    if (!banner) return notFound("Banner not found");

    const updated = await db.banner.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.linkUrl !== undefined ? { linkUrl: body.linkUrl } : {}),
        ...(body.position !== undefined ? { position: body.position } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    return ok(updated);
  }
);

/** DELETE /api/admin/banners/[id] — delete a banner. */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;
    const banner = await db.banner.findUnique({ where: { id } });
    if (!banner) return notFound("Banner not found");
    await db.banner.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
