import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, paginated, pageParams, withErrorHandling, ApiError } from "@/lib/api";
import { requireSeller } from "@/lib/rbac";
import { productUpsertSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

/** Require an approved seller profile (403 for admins without one). */
async function mustOwnSeller() {
  const { seller } = await requireSeller();
  if (!seller) throw new ApiError(403, "Seller profile not found");
  return seller;
}

async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await db.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/** GET /api/seller/products — own products, paginated, with stock, images and variants. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const seller = await mustOwnSeller();
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams);
  const where = { sellerId: seller.id };
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        images: { orderBy: { position: "asc" } },
        variants: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);
  return ok(paginated(items, total, page, limit));
});

/** POST /api/seller/products — create a product with images + variants. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const seller = await mustOwnSeller();
  const body = productUpsertSchema.parse(await req.json());

  if (await db.product.findUnique({ where: { sku: body.sku } })) {
    return fail("SKU already exists", 409);
  }
  for (const v of body.variants) {
    if (await db.productVariant.findUnique({ where: { sku: v.sku } })) {
      return fail(`Variant SKU already exists: ${v.sku}`, 409);
    }
  }

  const slugBase = body.slug?.trim() ? slugify(body.slug) : slugify(body.name);
  const slug = await uniqueProductSlug(slugBase || `product-${Date.now().toString(36)}`);

  const product = await db.product.create({
    data: {
      name: body.name,
      slug,
      description: body.description,
      sku: body.sku,
      price: body.price,
      discountPrice: body.discountPrice,
      stock: body.stock,
      weight: body.weight,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
      brandId: body.brandId,
      categoryId: body.categoryId,
      sellerId: seller.id,
      images: {
        create: body.images.map((img, i) => ({ url: img.url, alt: img.alt, position: i })),
      },
      variants: {
        create: body.variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes ?? undefined,
        })),
      },
    },
    include: { images: true, variants: true },
  });

  return ok(product, 201);
});
