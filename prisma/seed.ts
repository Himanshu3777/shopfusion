/**
 * ShopFusion dev seed — idempotent (safe to re-run).
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
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

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

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");

const ph = (name: string, color: string) =>
  `https://placehold.co/600x600/${color}/white?text=${encodeURIComponent(name)}`;

// ---------------- Categories ----------------
type CatDef = { name: string; description: string; children?: { name: string; description: string }[] };
const CATEGORIES: CatDef[] = [
  {
    name: "Electronics",
    description: "Phones, laptops, audio and smart devices.",
    children: [
      { name: "Mobiles", description: "Smartphones and accessories." },
      { name: "Laptops", description: "Laptops, notebooks and accessories." },
      { name: "Audio", description: "Headphones, earbuds and speakers." },
    ],
  },
  {
    name: "Fashion",
    description: "Clothing, footwear and accessories.",
    children: [
      { name: "Men", description: "Fashion for men." },
      { name: "Women", description: "Fashion for women." },
    ],
  },
  {
    name: "Home",
    description: "Everything for your home.",
    children: [
      { name: "Kitchen", description: "Cookware, dinnerware and kitchen essentials." },
      { name: "Furniture", description: "Chairs, lamps and home furniture." },
    ],
  },
  { name: "Beauty", description: "Skincare, makeup and personal care." },
  { name: "Grocery", description: "Pantry staples and everyday groceries." },
];

// ---------------- Brands ----------------
const BRANDS = ["VoltEdge", "UrbanThread", "CasaNova", "GlowKart", "FreshDaily"];

// ---------------- Products ----------------
type VariantDef = { name: string; sku: string; price?: number; stock: number };
type ProductDef = {
  sku: string;
  name: string;
  description: string;
  category: string; // leaf category slug
  brand: string;
  price: number;
  discountPrice?: number;
  stock: number;
  rating: number;
  reviews: number;
  color: string;
  variants?: VariantDef[];
};

const PRODUCTS: ProductDef[] = [
  // --- Electronics / VoltEdge ---
  {
    sku: "VE-X1-PHONE", name: "VoltEdge X1 Smartphone",
    description: "6.5\" AMOLED display, 50MP triple camera, 5000mAh battery and 5G. Ships with a 65W fast charger.",
    category: "mobiles", brand: "VoltEdge", price: 24999, discountPrice: 21999, stock: 120,
    rating: 4.4, reviews: 231, color: "6D28D9",
    variants: [
      { name: "128 GB", sku: "VE-X1-128", stock: 80 },
      { name: "256 GB", sku: "VE-X1-256", price: 23999, stock: 40 },
    ],
  },
  {
    sku: "VE-AIRBOOK-14", name: "VoltEdge AirBook 14 Laptop",
    description: "14\" 2.8K display, 16GB RAM, 512GB SSD, all-metal body at just 1.3kg. Perfect for work and play.",
    category: "laptops", brand: "VoltEdge", price: 58990, discountPrice: 52990, stock: 40,
    rating: 4.6, reviews: 118, color: "1E293B",
  },
  {
    sku: "VE-SONICPODS", name: "VoltEdge SonicPods Pro",
    description: "True wireless earbuds with active noise cancellation, 36-hour total playtime and wireless charging.",
    category: "audio", brand: "VoltEdge", price: 4999, discountPrice: 3499, stock: 300,
    rating: 4.3, reviews: 412, color: "F59E0B",
  },
  {
    sku: "VE-55TV-4K", name: "VoltEdge 55\" 4K Smart TV",
    description: "55-inch 4K UHD QLED panel with Dolby Vision, 40W speakers and built-in voice assistant.",
    category: "electronics", brand: "VoltEdge", price: 42999, discountPrice: 36999, stock: 25,
    rating: 4.5, reviews: 86, color: "0EA5E9",
  },
  {
    sku: "VE-PB-20000", name: "VoltEdge PowerBank 20000mAh",
    description: "20000mAh power bank with 22.5W fast charging, dual USB outputs and an LED battery indicator.",
    category: "electronics", brand: "VoltEdge", price: 2499, discountPrice: 1799, stock: 500,
    rating: 4.2, reviews: 640, color: "10B981",
  },
  // --- Fashion / UrbanThread ---
  {
    sku: "UT-DENIM-JKT", name: "UrbanThread Classic Denim Jacket",
    description: "Timeless mid-wash denim jacket in 100% cotton with metal buttons and a relaxed fit.",
    category: "men", brand: "UrbanThread", price: 3499, discountPrice: 2499, stock: 80,
    rating: 4.5, reviews: 154, color: "3B82F6",
    variants: [
      { name: "Size S", sku: "UT-DENIM-S", stock: 25 },
      { name: "Size M", sku: "UT-DENIM-M", stock: 30 },
      { name: "Size L", sku: "UT-DENIM-L", stock: 25 },
    ],
  },
  {
    sku: "UT-LINEN-SHIRT", name: "UrbanThread Linen Shirt",
    description: "Breathable pure-linen casual shirt with a modern cut — ideal for Indian summers.",
    category: "men", brand: "UrbanThread", price: 1999, discountPrice: 1499, stock: 150,
    rating: 4.3, reviews: 97, color: "14B8A6",
  },
  {
    sku: "UT-FLORAL-DRESS", name: "UrbanThread Floral Summer Dress",
    description: "Flowy midi dress with a floral print, smocked bodice and pockets. 100% viscose.",
    category: "women", brand: "UrbanThread", price: 2799, discountPrice: 1999, stock: 90,
    rating: 4.6, reviews: 203, color: "EC4899",
    variants: [
      { name: "Size S", sku: "UT-FLORAL-S", stock: 30 },
      { name: "Size M", sku: "UT-FLORAL-M", stock: 35 },
      { name: "Size L", sku: "UT-FLORAL-L", stock: 25 },
    ],
  },
  {
    sku: "UT-KNIT-SWEATER", name: "UrbanThread Knit Sweater",
    description: "Soft-touch ribbed knit sweater with a crew neckline. Warm without the bulk.",
    category: "women", brand: "UrbanThread", price: 2499, discountPrice: 1799, stock: 60,
    rating: 4.4, reviews: 76, color: "8B5CF6",
  },
  {
    sku: "UT-RUN-SNEAK", name: "UrbanThread Running Sneakers",
    description: "Lightweight running sneakers with cushioned EVA soles and breathable mesh uppers.",
    category: "men", brand: "UrbanThread", price: 4999, discountPrice: 3799, stock: 110,
    rating: 4.5, reviews: 188, color: "EF4444",
    variants: [
      { name: "UK 8", sku: "UT-RUN-8", stock: 35 },
      { name: "UK 9", sku: "UT-RUN-9", stock: 40 },
      { name: "UK 10", sku: "UT-RUN-10", stock: 35 },
    ],
  },
  // --- Home / CasaNova ---
  {
    sku: "CN-DINNER-24", name: "CasaNova Ceramic Dinner Set (24 pc)",
    description: "Elegant 24-piece ceramic dinner set for 6 — dinner plates, side plates, bowls and mugs.",
    category: "kitchen", brand: "CasaNova", price: 5999, discountPrice: 4499, stock: 45,
    rating: 4.7, reviews: 92, color: "F97316",
  },
  {
    sku: "CN-COOKWARE", name: "CasaNova Non-Stick Cookware Set",
    description: "5-layer non-stick cookware set with induction base — kadhai, fry pan and saucepan with lids.",
    category: "kitchen", brand: "CasaNova", price: 3999, discountPrice: 2999, stock: 70,
    rating: 4.4, reviews: 141, color: "64748B",
  },
  {
    sku: "CN-OAK-CHAIR", name: "CasaNova Oak Lounge Chair",
    description: "Solid oak lounge chair with a curved backrest and premium fabric cushioning.",
    category: "furniture", brand: "CasaNova", price: 12999, discountPrice: 9999, stock: 18,
    rating: 4.6, reviews: 54, color: "A16207",
  },
  {
    sku: "CN-LED-LAMP", name: "CasaNova LED Floor Lamp",
    description: "Minimalist arc floor lamp with dimmable warm-to-cool LED and a fabric shade.",
    category: "furniture", brand: "CasaNova", price: 2799, discountPrice: 1999, stock: 55,
    rating: 4.2, reviews: 68, color: "EAB308",
  },
  {
    sku: "CN-BEDSHEET", name: "CasaNova Cotton King Bedsheet",
    description: "300TC long-staple cotton king bedsheet with 2 pillow covers. Fade-resistant prints.",
    category: "home", brand: "CasaNova", price: 1499, discountPrice: 1099, stock: 200,
    rating: 4.3, reviews: 176, color: "06B6D4",
  },
  // --- Beauty / GlowKart ---
  {
    sku: "GK-VITC-SERUM", name: "GlowKart Vitamin C Serum",
    description: "15% ethylated vitamin C serum with hyaluronic acid for bright, even-toned skin. 30ml.",
    category: "beauty", brand: "GlowKart", price: 899, discountPrice: 649, stock: 250,
    rating: 4.5, reviews: 324, color: "F472B6",
  },
  {
    sku: "GK-HYDRA-MOIST", name: "GlowKart Hydra Moisturizer",
    description: "72-hour hydration gel moisturizer with ceramides — for all skin types. 50g.",
    category: "beauty", brand: "GlowKart", price: 699, discountPrice: 499, stock: 320,
    rating: 4.4, reviews: 287, color: "38BDF8",
  },
  {
    sku: "GK-LIP-SET", name: "GlowKart Matte Lipstick Set (6)",
    description: "Set of 6 long-wear matte lipsticks in everyday shades, enriched with vitamin E.",
    category: "beauty", brand: "GlowKart", price: 1199, discountPrice: 899, stock: 180,
    rating: 4.3, reviews: 159, color: "DB2777",
  },
  {
    sku: "GK-FACEWASH", name: "GlowKart Herbal Face Wash",
    description: "Gentle sulphate-free face wash with neem and aloe vera. 150ml.",
    category: "beauty", brand: "GlowKart", price: 399, discountPrice: 299, stock: 400,
    rating: 4.2, reviews: 411, color: "4ADE80",
  },
  // --- Grocery / FreshDaily ---
  {
    sku: "FD-ALMOND-1K", name: "FreshDaily Almonds 1kg",
    description: "Premium California almonds, vacuum-packed for freshness. Rich in protein and vitamin E.",
    category: "grocery", brand: "FreshDaily", price: 1099, discountPrice: 899, stock: 150,
    rating: 4.6, reviews: 268, color: "D97706",
  },
  {
    sku: "FD-HONEY-500", name: "FreshDaily Organic Honey 500g",
    description: "Raw, unprocessed organic honey sourced from Himalayan apiaries. NMR-tested pure.",
    category: "grocery", brand: "FreshDaily", price: 549, discountPrice: 449, stock: 220,
    rating: 4.5, reviews: 193, color: "FBBF24",
  },
  {
    sku: "FD-MUSTARD-1L", name: "FreshDaily Cold-Pressed Mustard Oil 1L",
    description: "Kachi-ghani cold-pressed mustard oil — pungent, pure and perfect for Indian cooking.",
    category: "grocery", brand: "FreshDaily", price: 329, discountPrice: 279, stock: 300,
    rating: 4.4, reviews: 345, color: "84CC16",
  },
  {
    sku: "FD-MASALA-COMBO", name: "FreshDaily Masala Combo Pack",
    description: "Everyday masala combo — turmeric, red chilli, coriander and garam masala (100g each).",
    category: "grocery", brand: "FreshDaily", price: 799, discountPrice: 649, stock: 260,
    rating: 4.3, reviews: 187, color: "F97316",
  },
  {
    sku: "FD-ATTA-5K", name: "FreshDaily Whole Wheat Atta 5kg",
    description: "Stone-ground whole wheat atta for soft, fluffy rotis. No maida, no additives.",
    category: "grocery", brand: "FreshDaily", price: 459, discountPrice: 399, stock: 350,
    rating: 4.4, reviews: 402, color: "EAB308",
  },
];

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
  const users = [
    { email: "admin@shopfusion.dev", name: "ShopFusion Admin", password: "Admin@123!", role: "ADMIN" as const },
    { email: "seller@shopfusion.dev", name: "TechBazaar Owner", password: "Seller@123!", role: "SELLER" as const },
    { email: "customer@shopfusion.dev", name: "Demo Customer", password: "Customer@123!", role: "CUSTOMER" as const },
  ];
  const userIdByEmail = new Map<string, string>();
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

  // ---- Seller profile for the demo seller (approved) ----
  const sellerUserId = userIdByEmail.get("seller@shopfusion.dev")!;
  const seller = await db.seller.upsert({
    where: { userId: sellerUserId },
    update: {
      storeName: "TechBazaar",
      description: "Gadgets, fashion, home essentials and more — curated quality at honest prices.",
      status: "APPROVED",
    },
    create: {
      userId: sellerUserId,
      storeName: "TechBazaar",
      storeSlug: "techbazaar",
      description: "Gadgets, fashion, home essentials and more — curated quality at honest prices.",
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
  console.log("Demo credentials:");
  console.log("  admin@shopfusion.dev    / Admin@123!    (ADMIN)");
  console.log("  seller@shopfusion.dev   / Seller@123!   (SELLER — TechBazaar, approved)");
  console.log("  customer@shopfusion.dev / Customer@123! (CUSTOMER)");
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
