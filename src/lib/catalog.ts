/**
 * Catalog-owned shared query logic (Worker 2).
 * Product listing filters, card serialization, product detail, slug helpers.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/selects";
import { computeDiscountPct, effectivePrice } from "@/lib/pricing";
import { pageParams, paginated } from "@/lib/api";
import { slugify } from "@/lib/utils";

/* ---------- Serialized product card ---------- */

type CardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPct: number;
  stock: number;
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  createdAt: string;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  seller: { storeName: string; storeSlug: string };
  image: { url: string; alt: string | null } | null;
};

export function toProductCard(p: CardRow): ProductCardData {
  const price = Number(p.price);
  const discountPrice = p.discountPrice != null ? Number(p.discountPrice) : null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price,
    discountPrice,
    effectivePrice: effectivePrice(price, discountPrice),
    discountPct: computeDiscountPct(price, discountPrice),
    stock: p.stock,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
    brand: p.brand,
    category: p.category,
    seller: p.seller,
    image: p.images[0] ?? null,
  };
}

/* ---------- Listing filters ---------- */

export const SORTS = ["relevance", "price-asc", "price-desc", "rating", "newest", "popularity"] as const;
export type SortKey = (typeof SORTS)[number];

export type ProductFilters = {
  categories: string[]; // slugs
  brands: string[]; // slugs
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock: boolean;
  onSale: boolean;
  isFeatured: boolean;
  sort: SortKey;
};

function numParam(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function listParam(sp: URLSearchParams, key: string): string[] {
  return (sp.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseProductFilters(sp: URLSearchParams): ProductFilters {
  const raw = sp.get("sort");
  const sort: SortKey = (SORTS as readonly string[]).includes(raw ?? "") ? (raw as SortKey) : "relevance";
  return {
    categories: listParam(sp, "category"),
    brands: listParam(sp, "brand"),
    q: sp.get("q")?.trim() || undefined,
    minPrice: numParam(sp, "minPrice"),
    maxPrice: numParam(sp, "maxPrice"),
    minRating: numParam(sp, "minRating"),
    inStock: sp.get("inStock") === "true",
    onSale: sp.get("onSale") === "true",
    isFeatured: sp.get("isFeatured") === "true",
    sort,
  };
}

export function buildProductWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (f.categories.length > 0) {
    where.category = f.categories.length === 1 ? { slug: f.categories[0] } : { slug: { in: f.categories } };
  }
  if (f.brands.length > 0) {
    where.brand = f.brands.length === 1 ? { slug: f.brands[0] } : { slug: { in: f.brands } };
  }
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
    ];
  }
  if (f.minRating != null) where.avgRating = { gte: f.minRating };
  if (f.inStock) where.stock = { gt: 0 };
  if (f.onSale) where.discountPrice = { not: null };
  if (f.isFeatured) where.isFeatured = true;
  return where;
}

function dbOrderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput | undefined {
  if (sort === "newest") return { createdAt: "desc" };
  if (sort === "rating") return { avgRating: "desc" };
  if (sort === "popularity") return { reviewCount: "desc" };
  return undefined; // relevance / price sorts handled below
}

/**
 * List products with filters, sorting and pagination.
 * Price-range filters and price sorts run in JS on the effective price
 * (discount-aware), everything else in the DB.
 */
export async function queryProducts(sp: URLSearchParams, extraWhere?: Prisma.ProductWhereInput) {
  const f = parseProductFilters(sp);
  const { page, limit, skip } = pageParams(sp);
  const where: Prisma.ProductWhereInput = { ...buildProductWhere(f), ...extraWhere };
  const needsJs =
    f.minPrice != null || f.maxPrice != null || f.sort === "price-asc" || f.sort === "price-desc";

  if (!needsJs) {
    const orderBy = dbOrderBy(f.sort) ?? { createdAt: "desc" };
    const [total, rows] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({ where, select: productCardSelect, orderBy, skip, take: limit }),
    ]);
    return { ...paginated(rows.map(toProductCard), total, page, limit), filters: f };
  }

  const rows = await db.product.findMany({ where, select: productCardSelect, orderBy: dbOrderBy(f.sort) });
  let items = rows.map(toProductCard);
  if (f.minPrice != null) items = items.filter((p) => p.effectivePrice >= (f.minPrice as number));
  if (f.maxPrice != null) items = items.filter((p) => p.effectivePrice <= (f.maxPrice as number));
  if (f.sort === "price-asc") items.sort((a, b) => a.effectivePrice - b.effectivePrice);
  else if (f.sort === "price-desc") items.sort((a, b) => b.effectivePrice - a.effectivePrice);
  else items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = items.length;
  return { ...paginated(items.slice(skip, skip + limit), total, page, limit), filters: f };
}

/* ---------- Product detail ---------- */

export type ProductVariantData = {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number;
  attributes: Record<string, string>;
};

export type ProductDetailData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPct: number;
  stock: number;
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  createdAt: string;
  brand: { id: string; name: string; slug: string; logo: string | null } | null;
  category: { id: string; name: string; slug: string };
  seller: { storeName: string; storeSlug: string };
  images: { id: string; url: string; alt: string | null }[];
  variants: ProductVariantData[];
  specs: { name: string; values: string[] }[];
  related: ProductCardData[];
};

export async function getProductDetail(slug: string): Promise<ProductDetailData | null> {
  const p = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      brand: true,
      category: true,
      seller: { select: { storeName: true, storeSlug: true } },
    },
  });
  if (!p || !p.isActive) return null;

  const price = Number(p.price);
  const discountPrice = p.discountPrice != null ? Number(p.discountPrice) : null;

  // Specs: roll up variant attributes (name -> distinct values)
  const specMap = new Map<string, Set<string>>();
  for (const v of p.variants) {
    const attrs = (v.attributes ?? {}) as Record<string, unknown>;
    for (const [k, val] of Object.entries(attrs)) {
      if (val == null || val === "") continue;
      if (!specMap.has(k)) specMap.set(k, new Set());
      specMap.get(k)!.add(String(val));
    }
  }
  const specs = [...specMap.entries()].map(([name, values]) => ({ name, values: [...values] }));

  const related = await db.product.findMany({
    where: { isActive: true, categoryId: p.categoryId, id: { not: p.id } },
    select: productCardSelect,
    orderBy: { reviewCount: "desc" },
    take: 8,
  });

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    sku: p.sku,
    price,
    discountPrice,
    effectivePrice: effectivePrice(price, discountPrice),
    discountPct: computeDiscountPct(price, discountPrice),
    stock: p.stock,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
    brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug, logo: p.brand.logo } : null,
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
    seller: p.seller,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price != null ? Number(v.price) : null,
      stock: v.stock,
      attributes: (v.attributes ?? {}) as Record<string, string>,
    })),
    specs,
    related: related.map(toProductCard),
  };
}

/* ---------- Next.js searchParams helper ---------- */

/** Convert Next.js App Router searchParams into URLSearchParams for catalog queries. */
export function toURLSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) {
      for (const x of v) if (x) params.append(k, x);
    } else if (v) {
      params.set(k, v);
    }
  }
  return params;
}

/* ---------- Slug helpers ---------- */

export async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const clean = slugify(base) || "category";
  let slug = clean;
  let i = 2;
  for (;;) {
    const found = await db.category.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!found) return slug;
    slug = `${clean}-${i++}`;
  }
}

export async function uniqueBrandSlug(base: string, excludeId?: string): Promise<string> {
  const clean = slugify(base) || "brand";
  let slug = clean;
  let i = 2;
  for (;;) {
    const found = await db.brand.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!found) return slug;
    slug = `${clean}-${i++}`;
  }
}
