import { Prisma } from "@prisma/client";

/** Shared product-card select used across listing/search/related endpoints. */
export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  discountPrice: true,
  stock: true,
  avgRating: true,
  reviewCount: true,
  isFeatured: true,
  createdAt: true,
  priceTrend: true,
  priceTrendAt: true,
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  seller: { select: { storeName: true, storeSlug: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" as const }, take: 1 },
} satisfies Prisma.ProductSelect;
