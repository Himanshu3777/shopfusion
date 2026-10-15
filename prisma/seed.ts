/**
 * ShopFusion seed — idempotent (safe to re-run).
 * Run: `npx tsx prisma/seed.ts`  (or `npm run db:seed`)
 *
 * Creates (via upsert):
 *  - Category tree (Electronics > Mobiles/Laptops/Audio, Fashion > Men/Women,
 *    Home > Kitchen/Furniture, Beauty, Grocery)
 *  - Brands: VoltEdge, UrbanThread, CasaNova, GlowKart, FreshDaily
 *  - Demo users (admin / seller / customer)
 *  - Approved seller "TechBazaar" owned by the demo seller
 *  - 24 sample products with INR pricing, stock, ratings and placeholder images
 *  - Coupon WELCOME10 and two home-hero banners
 *
 * Production-safe catalog mode:
 *  `SEED_CATALOG_ONLY=1 npx tsx prisma/seed.ts`
 *  Seeds the same catalog but skips the predictable demo logins. Instead it
 *  creates a single internal store owner (store@shopfusion.internal) with a
 *  random, unguessable password and an approved "ShopFusion Official" seller.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { slugify, ph, CATEGORIES, BRANDS, PRODUCTS } from "./catalog-data";

// --- Minimal .env loader (no extra deps; mirrors prisma.config.ts) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Seeding ShopFusion…");

  // ---- Categories (upsert tree) ----
  const catIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const slug = slugify(c.name);
    const parent = await db.category.upsert({
      where: { slug },
      update: { name: c.name, description: c.description, isActive: true },
      create: { name: c.name, slug, description: c.description, isActive: true },
    });
    catIdBySlug.set(slug, parent.id);
    for (const child of c.children ?? []) {
      const cslug = slugify(child.name);
      const created = await db.category.upsert({
        where: { slug: cslug },
        update: { name: child.name, description: child.description, isActive: true, parentId: parent.id },
        create: { name: child.name, slug: cslug, description: child.description, isActive: true, parentId: parent.id },
      });
      catIdBySlug.set(cslug, created.id);
    }
  }
  console.log(`  categories: ${catIdBySlug.size}`);

  // ---- Brands ----
  const brandIdByName = new Map<string, string>();
  for (const name of BRANDS) {
    const slug = slugify(name);
    const b = await db.brand.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true },
    });
    brandIdByName.set(name, b.id);
  }
  console.log(`  brands: ${brandIdByName.size}`);

  // ---- Users ----
  // SEED_CATALOG_ONLY=1 → production-safe mode: no predictable demo logins.
  const CATALOG_ONLY = process.env.SEED_CATALOG_ONLY === "1";
  const STORE_OWNER_EMAIL = CATALOG_ONLY ? "store@shopfusion.internal" : "seller@shopfusion.dev";
  const userIdByEmail = new Map<string, string>();
  if (CATALOG_ONLY) {
    const { randomBytes } = await import("node:crypto");
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    const created = await db.user.upsert({
      where: { email: STORE_OWNER_EMAIL },
      update: { name: "ShopFusion Official Store", passwordHash, role: "SELLER", isBanned: false },
      create: { email: STORE_OWNER_EMAIL, name: "ShopFusion Official Store", passwordHash, role: "SELLER" },
    });
    userIdByEmail.set(STORE_OWNER_EMAIL, created.id);
    console.log("  users: 1 (internal store owner, random unguessable password)");
  } else {
    const users = [
      { email: "admin@shopfusion.dev", name: "ShopFusion Admin", password: "Admin@123!", role: "ADMIN" as const },
      { email: "seller@shopfusion.dev", name: "TechBazaar Owner", password: "Seller@123!", role: "SELLER" as const },
      { email: "customer@shopfusion.dev", name: "Demo Customer", password: "Customer@123!", role: "CUSTOMER" as const },
    ];
    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      const created = await db.user.upsert({
        where: { email: u.email },
        update: { name: u.name, passwordHash, role: u.role, isBanned: false },
        create: { email: u.email, name: u.name, passwordHash, role: u.role },
      });
      userIdByEmail.set(u.email, created.id);
    }
    console.log(`  users: ${userIdByEmail.size}`);
  }

  // ---- Seller profile (approved) ----
  const sellerUserId = userIdByEmail.get(STORE_OWNER_EMAIL)!;
  const storeName = CATALOG_ONLY ? "ShopFusion Official" : "TechBazaar";
  const storeSlug = CATALOG_ONLY ? "shopfusion-official" : "techbazaar";
  const storeDesc = CATALOG_ONLY
    ? "The official ShopFusion store — curated quality at honest prices."
    : "Gadgets, fashion, home essentials and more — curated quality at honest prices.";
  const seller = await db.seller.upsert({
    where: { userId: sellerUserId },
    update: { storeName, description: storeDesc, status: "APPROVED" },
    create: {
      userId: sellerUserId,
      storeName,
      storeSlug,
      description: storeDesc,
      status: "APPROVED",
    },
  });
  console.log(`  seller: ${seller.storeName} (${seller.status})`);

  // ---- Products (idempotent by SKU) ----
  let productCount = 0;
  for (const p of PRODUCTS) {
    const categoryId = catIdBySlug.get(p.category);
    const brandId = brandIdByName.get(p.brand);
    if (!categoryId || !brandId) throw new Error(`Missing category/brand for ${p.sku}`);
    const slug = slugify(p.name);
    const fields = {
      name: p.name,
      slug,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice ?? null,
      stock: p.stock,
      isActive: true,
      brandId,
      categoryId,
      sellerId: seller.id,
      avgRating: p.rating,
      reviewCount: p.reviews,
    };
    const existing = await db.product.findUnique({ where: { sku: p.sku } });
    let productId: string;
    if (existing) {
      await db.product.update({ where: { sku: p.sku }, data: fields });
      await db.productImage.deleteMany({ where: { productId: existing.id } });
      await db.productVariant.deleteMany({ where: { productId: existing.id } });
      productId = existing.id;
    } else {
      const created = await db.product.create({ data: { ...fields, sku: p.sku } });
      productId = created.id;
    }
    await db.productImage.create({
      data: { productId, url: ph(p.name, p.color), alt: p.name, position: 0 },
    });
    if (p.variants) {
      await db.productVariant.createMany({
        data: p.variants.map((v) => ({
          productId,
          name: v.name,
          sku: v.sku,
          price: v.price ?? null,
          stock: v.stock,
        })),
      });
    }
    productCount++;
  }
  console.log(`  products: ${productCount}`);

  // ---- Bulk generated catalog (SEED_BULK=1) ----
  // Deterministic ~2.8k extra products via bulk inserts. Idempotent: SKUs that
  // already exist are skipped, so re-runs are cheap and safe.
  if (process.env.SEED_BULK === "1") {
    const { generateCatalog } = await import("./catalog-generator");
    const items = generateCatalog();
    const existingSkus = new Set(
      (await db.product.findMany({ select: { sku: true } })).map((p) => p.sku)
    );
    const fresh = items.filter((p) => !existingSkus.has(p.sku));
    console.log(`  bulk catalog: ${items.length} generated, ${fresh.length} new`);
    const CHUNK = 1000;
    const rows = fresh.map((p) => {
      const categoryId = catIdBySlug.get(p.category);
      const brandId = brandIdByName.get(p.brand);
      if (!categoryId || !brandId) throw new Error(`Missing category/brand for ${p.sku}`);
      return {
        name: p.name,
        slug: slugify(p.name),
        description: p.description,
        sku: p.sku,
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        isActive: true,
        brandId,
        categoryId,
        sellerId: seller.id,
        avgRating: p.rating,
        reviewCount: p.reviews,
      };
    });
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.product.createMany({ data: rows.slice(i, i + CHUNK) });
    }
    if (fresh.length > 0) {
      const idBySku = new Map(
        (
          await db.product.findMany({
            where: { sku: { in: fresh.map((p) => p.sku) } },
            select: { id: true, sku: true },
          })
        ).map((p) => [p.sku, p.id] as const)
      );
      const images = fresh.map((p) => ({
        productId: idBySku.get(p.sku)!,
        url: ph(p.name, p.color),
        alt: p.name,
        position: 0,
      }));
      const variants = fresh.flatMap((p) =>
        (p.variants ?? []).map((v) => ({
          productId: idBySku.get(p.sku)!,
          name: v.name,
          sku: v.sku,
          price: null,
          stock: v.stock,
        }))
      );
      for (let i = 0; i < images.length; i += CHUNK) {
        await db.productImage.createMany({ data: images.slice(i, i + CHUNK) });
      }
      for (let i = 0; i < variants.length; i += CHUNK) {
        await db.productVariant.createMany({ data: variants.slice(i, i + CHUNK) });
      }
      console.log(`  bulk images: ${images.length}, variants: ${variants.length}`);
    }
  }

  // ---- Coupon ----
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {
      description: "10% off up to ₹500 on orders above ₹999",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 999,
      maxDiscount: 500,
      isActive: true,
    },
    create: {
      code: "WELCOME10",
      description: "10% off up to ₹500 on orders above ₹999",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 999,
      maxDiscount: 500,
      isActive: true,
    },
  });
  console.log("  coupon: WELCOME10");

  // ---- Banners ----
  const banners = [
    {
      title: "Mega Electronics Fest",
      subtitle: "Up to 40% off on VoltEdge devices — phones, laptops and audio.",
      imageUrl: "https://placehold.co/1200x400/4C1D95/white?text=Mega+Electronics+Fest",
      linkUrl: "/search?category=electronics",
      position: "home-hero",
      sortOrder: 0,
    },
    {
      title: "Fashion Forward",
      subtitle: "New-season styles from UrbanThread, now live.",
      imageUrl: "https://placehold.co/1200x400/F59E0B/white?text=Fashion+Forward",
      linkUrl: "/search?category=fashion",
      position: "home-hero",
      sortOrder: 1,
    },
  ];
  for (const b of banners) {
    const existing = await db.banner.findFirst({ where: { title: b.title, position: b.position } });
    if (existing) {
      await db.banner.update({ where: { id: existing.id }, data: { ...b, isActive: true } });
    } else {
      await db.banner.create({ data: { ...b, isActive: true } });
    }
  }
  console.log(`  banners: ${banners.length}`);

  console.log("\nSeed complete ✅");
  if (!CATALOG_ONLY) {
    console.log("Demo credentials:");
    console.log("  admin@shopfusion.dev    / Admin@123!    (ADMIN)");
    console.log("  seller@shopfusion.dev   / Seller@123!   (SELLER — TechBazaar, approved)");
    console.log("  customer@shopfusion.dev / Customer@123! (CUSTOMER)");
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
