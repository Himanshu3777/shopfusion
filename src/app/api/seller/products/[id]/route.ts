import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, notFound, withErrorHandling, ApiError } from "@/lib/api";
import { requireSeller } from "@/lib/rbac";
import { productUpsertSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

async function mustOwnSeller() {
  const { seller } = await requireSeller();
  if (!seller) throw new ApiError(403, "Seller profile not found");
  return seller;
}

async function uniqueProductSlug(base: string, excludeId: string): Promise<string> {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await db.product.findFirst({ where: { slug, id: { not: excludeId } } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function ownedProduct(sellerId: string, id: string) {
  const product = await db.product.findFirst({
    where: { id, sellerId },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: true,
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!product) throw new ApiError(404, "Product not found");
  return product;
}

const partialProductSchema = productUpsertSchema.partial();

/** GET /api/seller/products/[id] — own product only. */
export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const seller = await mustOwnSeller();
    const { id } = await params;
    const product = await ownedProduct(seller.id, id);
    return ok(product);
  }
);

/** PATCH /api/seller/products/[id] — update own product (replaces images/variants when provided). */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const seller = await mustOwnSeller();
    const { id } = await params;
    const product = await ownedProduct(seller.id, id);
    const body = partialProductSchema.parse(await req.json());

    if (body.sku && body.sku !== product.sku && (await db.product.findUnique({ where: { sku: body.sku } }))) {
      return fail("SKU already exists", 409);
    }
    if (body.variants) {
      for (const v of body.variants) {
        const clash = await db.productVariant.findFirst({
          where: { sku: v.sku, productId: { not: id } },
        });
        if (clash) return fail(`Variant SKU already exists: ${v.sku}`, 409);
      }
    }

    let slug = product.slug;
    if (body.slug?.trim()) {
      slug = await uniqueProductSlug(slugify(body.slug), id);
    } else if (body.name && body.name !== product.name) {
      slug = await uniqueProductSlug(slugify(body.name) || product.slug, id);
    }

    const updated = await db.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          slug,
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.sku !== undefined ? { sku: body.sku } : {}),
          ...(body.price !== undefined ? { price: body.price } : {}),
          ...(body.discountPrice !== undefined ? { discountPrice: body.discountPrice } : {}),
          ...(body.stock !== undefined ? { stock: body.stock } : {}),
          ...(body.weight !== undefined ? { weight: body.weight } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
          ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
          ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        },
      });
      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (body.images.length > 0) {
          await tx.productImage.createMany({
            data: body.images.map((img, i) => ({ productId: id, url: img.url, alt: img.alt, position: i })),
          });
        }
      }
      if (body.variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (body.variants.length > 0) {
          await tx.productVariant.createMany({
            data: body.variants.map((v) => ({
              productId: id,
              name: v.name,
              sku: v.sku,
              price: v.price ?? null,
              stock: v.stock ?? 0,
              attributes: v.attributes ?? undefined,
            })),
          });
        }
      }
      return tx.product.findUnique({
        where: { id },
        include: { images: { orderBy: { position: "asc" } }, variants: true },
      });
    });

    return ok(updated);
  }
);

/** DELETE /api/seller/products/[id] — own product only (blocked when order history exists). */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const seller = await mustOwnSeller();
    const { id } = await params;
    await ownedProduct(seller.id, id);

    const orderItems = await db.orderItem.count({ where: { productId: id } });
    if (orderItems > 0) {
      return fail("This product has order history and cannot be deleted. Deactivate it instead.", 400);
    }
    await db.product.delete({ where: { id } });
    return ok({ deleted: true });
  }
);
