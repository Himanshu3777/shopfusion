import { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { queryProducts } from "@/lib/catalog";

/** Public product search — same listing logic, but q is required (min 2 chars). */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return fail("Search query must be at least 2 characters", 400);
  }
  const result = await queryProducts(sp);
  return ok(result);
});
