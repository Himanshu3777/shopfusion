import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getProductDetail } from "@/lib/catalog";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchase } from "@/components/ProductPurchase";
import { ProductCard } from "@/components/ProductCard";
import { RecordView } from "@/components/RecentlyViewed";
import { Badge, Card, RatingStars } from "@/components/ui";
import { PriceHistorySection } from "@/components/PriceHistorySection";
import { Suspense } from "react";


type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProductDetail(slug);
  return {
    title: detail ? `${detail.name} · ShopFusion` : "Product not found",
    description: detail?.description.slice(0, 160),
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const detail = await getProductDetail(slug);
  if (!detail) notFound();

  const [reviews, ratingGroups] = await Promise.all([
    db.review.findMany({
      where: { productId: detail.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    db.review.groupBy({
      by: ["rating"],
      where: { productId: detail.id },
      _count: { rating: true },
    }),
  ]);
  const dist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: ratingGroups.find((g) => g.rating === r)?._count.rating ?? 0,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <RecordView
        item={{ slug: detail.slug, name: detail.name, image: detail.images[0]?.url ?? null, price: detail.effectivePrice }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href={`/category/${detail.category.slug}`} className="hover:underline">{detail.category.name}</Link>
        {" / "}
        <span className="text-slate-800 dark:text-slate-200">{detail.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={detail.images} name={detail.name} />

        <div>
          {detail.brand && (
            <Link href={`/products?brand=${detail.brand.slug}`} className="text-sm font-medium uppercase tracking-wide text-fusion-700 hover:underline dark:text-fusion-300">
              {detail.brand.name}
            </Link>
          )}
          <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{detail.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <RatingStars value={detail.avgRating} size="md" />
            <span className="text-sm text-slate-500">
              {detail.avgRating.toFixed(1)} · {detail.reviewCount} review{detail.reviewCount === 1 ? "" : "s"}
            </span>
          </div>

          <ProductPurchase product={detail} />

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-500">
            <Badge tone="success">Free delivery over ₹499</Badge>
            <Badge tone="neutral">7-day easy returns</Badge>
            <Badge tone="neutral">SKU: {detail.sku}</Badge>
          </div>
        </div>
      </div>

      {/* Description + specs */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">About this product</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {detail.description}
          </p>
        </Card>
        {detail.specs.length > 0 && (
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold">Specifications</h2>
            <dl className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {detail.specs.map((s) => (
                <div key={s.name} className="flex gap-4 py-2">
                  <dt className="w-32 shrink-0 font-medium capitalize text-slate-500">{s.name}</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{s.values.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {/* Price history (streams in) */}
      <Suspense fallback={null}>
        <PriceHistorySection productId={detail.id} />
      </Suspense>

      {/* Reviews summary */}
      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-bold">Ratings & reviews</h2>
        <div className="mt-4 grid gap-8 md:grid-cols-[240px_1fr]">
          <div>
            <p className="font-display text-4xl font-extrabold">{detail.avgRating.toFixed(1)}<span className="text-lg text-slate-400">/5</span></p>
            <RatingStars value={detail.avgRating} size="md" />
            <p className="mt-1 text-sm text-slate-500">{detail.reviewCount} verified ratings</p>
            <div className="mt-3 space-y-1">
              {dist.map((d) => (
                <div key={d.rating} className="flex items-center gap-2 text-xs">
                  <span className="w-6">{d.rating}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-glow-500"
                      style={{ width: `${detail.reviewCount ? Math.round((d.count / detail.reviewCount) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-500">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {reviews.length === 0 && <p className="text-sm text-slate-500">No reviews yet — be the first to review this product after purchase.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <RatingStars value={r.rating} />
                  {r.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                </div>
                {r.title && <p className="mt-1 text-sm font-semibold">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.body}</p>}
                <p className="mt-1 text-xs text-slate-400">by {r.user.name ?? "ShopFusion customer"}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Related */}
      {detail.related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {detail.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
