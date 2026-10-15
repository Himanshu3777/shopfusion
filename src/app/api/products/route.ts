import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api";
import { queryProducts } from "@/lib/catalog";

/** Public product listing with filters, sort and pagination. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const result = await queryProducts(new URL(req.url).searchParams);
  return ok(result);
});
