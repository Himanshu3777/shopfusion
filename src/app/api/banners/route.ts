import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";

/** Public active banners for a position (default home-hero), ordered. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const sp = new URL(req.url).searchParams;
  const position = sp.get("position")?.trim() || "home-hero";
  const banners = await db.banner.findMany({
    where: { position, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return ok(banners);
});
