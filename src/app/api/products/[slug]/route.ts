import { NextRequest } from "next/server";
import { ok, notFound, withErrorHandling } from "@/lib/api";
import { getProductDetail } from "@/lib/catalog";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Full product detail: all images, active variants, brand, category,
 * seller, rating summary, rolled-up specs and related products.
 */
export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { slug } = await params;
  const detail = await getProductDetail(slug);
  if (!detail) return notFound("Product not found");
  return ok(detail);
});
