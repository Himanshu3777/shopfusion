import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/selects";
import { toProductCard, type ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { Button } from "@/components/ui";
import { HeroSkeleton, CategorySkeleton, ProductGridSkeleton } from "@/components/HomeSkeletons";

// Each section fetches its own data so the page streams:
// the shell renders instantly, sections appear as their queries resolve.

async function HeroSection() {
  const banners = await db.banner.findMany({
    where: { position: "home-hero", isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });
  const hero = banners[0];
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-fusion-800 via-fusion-700 to-fusion-950 text-white">
        {hero?.imageUrl && (
          <img src={hero.imageUrl} alt={hero.title} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16 sm:py-24">
          <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide uppercase">ShopFusion Originals</p>
          <h1 className="font-display max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
            {hero?.title ?? "Everything you love, fused into one marketplace"}
          </h1>
          <p className="max-w-xl text-white/80">
            {hero?.subtitle ?? "Electronics, fashion, home essentials and more — from verified sellers across India, with honest prices and easy returns."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={hero?.linkUrl ?? "/products"}>
              <Button size="lg" className="bg-glow-500 text-slate-950 hover:bg-glow-400">Shop now</Button>
            </Link>
            <Link href="/deals">
              <Button size="lg" variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Today&apos;s deals</Button>
            </Link>
          </div>
        </div>
      </section>
      {banners.length > 1 && (
        <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pt-8 sm:grid-cols-3">
          {banners.slice(1).map((b) => (
            <Link key={b.id} href={b.linkUrl ?? "/products"} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {b.imageUrl && <img src={b.imageUrl} alt={b.title} loading="lazy" className="aspect-[16/9] w-full object-cover transition group-hover:scale-105" />}
              <div className="p-4">
                <p className="font-display font-semibold">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-sm text-slate-500">{b.subtitle}</p>}
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}

async function CategorySection() {
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 8,
  });
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Shop by category</h2>
        <Link href="/products" className="text-sm font-medium text-fusion-700 hover:underline dark:text-fusion-300">All products →</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fusion-50 text-2xl dark:bg-fusion-950">
              {c.image ? <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover" /> : "◈"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold group-hover:text-fusion-700 dark:group-hover:text-fusion-300">{c.name}</p>
              <p className="text-xs text-slate-500">Explore →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductGrid({
  title,
  href,
  linkLabel,
  items,
}: {
  title: string;
  href: string;
  linkLabel: string;
  items: ProductCardData[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        <Link href={href} className="text-sm font-medium text-fusion-700 hover:underline dark:text-fusion-300">
          {linkLabel} →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

async function TrendingSection() {
  const rows = await db.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: productCardSelect,
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return <ProductGrid title="Trending now" href="/products?isFeatured=true" linkLabel="View all trending" items={rows.map(toProductCard)} />;
}

async function BestSellersSection() {
  const rows = await db.product.findMany({
    where: { isActive: true },
    select: productCardSelect,
    orderBy: { reviewCount: "desc" },
    take: 8,
  });
  return <ProductGrid title="Best sellers" href="/products?sort=popularity" linkLabel="View all" items={rows.map(toProductCard)} />;
}

async function DealsSection() {
  const rows = await db.product.findMany({
    where: { isActive: true, discountPrice: { not: null } },
    select: productCardSelect,
    orderBy: { reviewCount: "desc" },
    take: 8,
  });
  return <ProductGrid title="Deals of the day" href="/deals" linkLabel="All deals" items={rows.map(toProductCard)} />;
}

export default function HomePage() {
  return (
    <div>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      <Suspense fallback={<CategorySkeleton />}>
        <CategorySection />
      </Suspense>

      <Suspense fallback={<ProductGridSkeleton />}>
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<ProductGridSkeleton titleWidth="w-36" />}>
        <BestSellersSection />
      </Suspense>

      <Suspense fallback={<ProductGridSkeleton titleWidth="w-44" />}>
        <DealsSection />
      </Suspense>

      <RecentlyViewed />
    </div>
  );
}
