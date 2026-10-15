/**
 * Deterministic bulk catalog generator for ShopFusion.
 *
 * Generates ~2,800 sample products across all categories with INR pricing,
 * ratings, stock and placeholder imagery. Pure function — no DB access.
 *
 * Determinism: a seeded PRNG (mulberry32) drives every random choice, so the
 * same SKUs, names and slugs are produced on every run. That makes the bulk
 * seed idempotent: re-runs simply skip SKUs that already exist.
 *
 * Run a self-check: `npx tsx prisma/catalog-generator.ts`
 */

export interface BulkVariant {
  name: string;
  sku: string;
  stock: number;
}

export interface BulkProduct {
  sku: string;
  name: string;
  description: string;
  category: string; // category slug
  brand: string; // brand name
  price: number;
  discountPrice: number | null;
  stock: number;
  rating: number;
  reviews: number;
  color: string; // hex for placeholder image
  variants?: BulkVariant[];
}

interface Line {
  cat: string;
  brand: string;
  label: string;
  prefix: string; // unique SKU prefix
  count: number;
  pmin: number;
  pmax: number;
  variants?: string[];
}

/** Deterministic PRNG */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUFFIXES = ["", "Pro", "Max", "Lite", "Plus", "Neo"];

const DESCS: Record<string, string[]> = {
  mobiles: [
    "{name} by {brand} brings a smooth high-refresh display, dependable all-day battery life and cameras that shine day and night. A great everyday {label}.",
    "Meet the {name} — snappy performance, clean software and fast charging that gets you going in minutes. {brand}'s most loved {label} series.",
    "The {name} delivers flagship-style features at an honest price: crisp display, solid build and reliable cameras. A smart pick among {label}.",
  ],
  laptops: [
    "{name} pairs a sharp display with fast SSD storage and all-day battery — built for work, study and play. {brand} quality you can trust.",
    "Power through your day with the {name}: responsive performance, backlit keyboard and a sleek metal body. A dependable {label}.",
    "The {name} is a versatile {label} with immersive visuals and strong thermals. Great for creators and professionals alike.",
  ],
  audio: [
    "Hear every detail with the {name} — rich bass, clear highs and a comfortable all-day fit. {brand}'s signature {label} sound.",
    "The {name} delivers punchy, balanced audio with long battery life and quick pairing. Your perfect {label} companion.",
    "Crystal-clear calls and deep bass make the {name} a standout {label}. Lightweight, durable and travel-ready.",
  ],
  electronics: [
    "The {name} brings big-screen entertainment home with vivid colours and room-filling sound. A {brand} {label} built to impress.",
    "Upgrade your setup with the {name} — reliable performance, smart features and {brand}'s trusted build quality.",
    "Designed for Indian homes, the {name} is an efficient, durable {label} that just works, day after day.",
  ],
  men: [
    "The {name} is cut for comfort with premium fabric that lasts wash after wash. A wardrobe essential from {brand}.",
    "Sharp looks, easy care — the {name} is a versatile {label} that pairs with everything. {brand} craftsmanship in every stitch.",
    "Elevate your everyday style with the {name}. Breathable, durable and effortlessly cool.",
  ],
  women: [
    "The {name} drapes beautifully in soft, breathable fabric with a flattering fit. {brand} brings you festive-ready elegance.",
    "Feminine, comfortable and easy to style — the {name} is a must-have {label} for every wardrobe.",
    "Crafted with care, the {name} blends contemporary design with all-day comfort. You'll reach for it again and again.",
  ],
  fashion: [
    "The {name} adds the perfect finishing touch — premium materials and a timeless design from {brand}.",
    "Detailing matters: the {name} is a refined {label} built to age gracefully. A small upgrade with big impact.",
    "Classic and versatile, the {name} complements both ethnic and western looks. {brand} quality, honest price.",
  ],
  kitchen: [
    "Cook like a pro with the {name} — even heating, easy cleaning and a build that lasts for years. A {brand} kitchen essential.",
    "The {name} makes everyday cooking faster and more fun. Sturdy, safe and designed for Indian kitchens.",
    "From daily meals to festive feasts, the {name} is a reliable {label} you'll use every single day.",
  ],
  furniture: [
    "The {name} blends solid construction with timeless design — comfort and style for your living space. {brand} home collection.",
    "Built to last and easy to maintain, the {name} is a practical {label} that elevates any room.",
    "Thoughtful design meets everyday durability in the {name}. A beautiful addition to modern Indian homes.",
  ],
  home: [
    "The {name} adds warmth and character to your space with premium materials and a refined finish. From {brand}.",
    "Soft, durable and easy to care for — the {name} is a lovely {label} that refreshes any room instantly.",
    "Details make the home: the {name} is a tasteful {label} crafted for comfort and long-lasting beauty.",
  ],
  beauty: [
    "The {name} is dermat-tested and made for Indian skin — gentle, effective and free from harsh chemicals. Glow with {brand}.",
    "Clean ingredients, visible results: the {name} is a skincare staple your routine was missing.",
    "Pamper yourself with the {name} — a feel-good {label} with a light texture and a subtle, pleasant fragrance.",
  ],
  grocery: [
    "The {name} is sourced from trusted farms and packed fresh for maximum nutrition. A {brand} pantry staple.",
    "Pure, unadulterated and full of flavour — the {name} brings farm freshness to your kitchen.",
    "Everyday goodness: the {name} is hygienically packed and quality-checked, so your family gets only the best.",
  ],
};

const COLORS: Record<string, string[]> = {
  mobiles: ["6D28D9", "1E293B", "0EA5E9", "111827"],
  laptops: ["1E293B", "374151", "4C1D95", "0F172A"],
  audio: ["F59E0B", "8B5CF6", "EC4899", "10B981"],
  electronics: ["0EA5E9", "6366F1", "1E293B", "0891B2"],
  men: ["3B82F6", "14B8A6", "64748B", "1E293B"],
  women: ["EC4899", "8B5CF6", "F472B6", "DB2777"],
  fashion: ["A16207", "57534E", "92400E", "44403C"],
  kitchen: ["F97316", "64748B", "DC2626", "0D9488"],
  furniture: ["A16207", "92400E", "57534E", "78716C"],
  home: ["06B6D4", "EAB308", "F59E0B", "84CC16"],
  beauty: ["F472B6", "38BDF8", "DB2777", "4ADE80"],
  grocery: ["D97706", "84CC16", "FBBF24", "65A30D"],
};

const LINES: Line[] = [
  // ---- mobiles / VoltEdge ----
  { cat: "mobiles", brand: "VoltEdge", label: "Smartphone", prefix: "VE-MOB-SM", count: 280, pmin: 8999, pmax: 34999, variants: ["128 GB", "256 GB"] },
  { cat: "mobiles", brand: "VoltEdge", label: "5G Smartphone", prefix: "VE-MOB-5G", count: 200, pmin: 12999, pmax: 44999, variants: ["128 GB", "256 GB"] },
  { cat: "mobiles", brand: "VoltEdge", label: "Gaming Phone", prefix: "VE-MOB-GM", count: 120, pmin: 19999, pmax: 54999, variants: ["256 GB", "512 GB"] },
  { cat: "mobiles", brand: "VoltEdge", label: "Budget Phone", prefix: "VE-MOB-BD", count: 200, pmin: 5999, pmax: 12999 },
  { cat: "mobiles", brand: "VoltEdge", label: "Phone Case", prefix: "VE-MOB-CS", count: 160, pmin: 299, pmax: 999 },
  { cat: "mobiles", brand: "VoltEdge", label: "Fast Charger", prefix: "VE-MOB-CH", count: 120, pmin: 799, pmax: 2499 },
  { cat: "mobiles", brand: "VoltEdge", label: "Screen Guard", prefix: "VE-MOB-SG", count: 100, pmin: 149, pmax: 499 },
  // ---- laptops / VoltEdge ----
  { cat: "laptops", brand: "VoltEdge", label: "Ultrabook Laptop", prefix: "VE-LAP-UB", count: 160, pmin: 45999, pmax: 89999, variants: ["512 GB SSD", "1 TB SSD"] },
  { cat: "laptops", brand: "VoltEdge", label: "Gaming Laptop", prefix: "VE-LAP-GM", count: 120, pmin: 69999, pmax: 149999, variants: ["512 GB SSD", "1 TB SSD"] },
  { cat: "laptops", brand: "VoltEdge", label: "2-in-1 Laptop", prefix: "VE-LAP-21", count: 100, pmin: 39999, pmax: 79999 },
  { cat: "laptops", brand: "VoltEdge", label: "Laptop Sleeve", prefix: "VE-LAP-SL", count: 100, pmin: 799, pmax: 2499 },
  { cat: "laptops", brand: "VoltEdge", label: "Wireless Mouse", prefix: "VE-LAP-MS", count: 120, pmin: 899, pmax: 2999 },
  { cat: "laptops", brand: "VoltEdge", label: "Mechanical Keyboard", prefix: "VE-LAP-KB", count: 100, pmin: 2499, pmax: 7999 },
  // ---- audio / VoltEdge ----
  { cat: "audio", brand: "VoltEdge", label: "Wireless Earbuds", prefix: "VE-AUD-EB", count: 240, pmin: 1499, pmax: 5999 },
  { cat: "audio", brand: "VoltEdge", label: "Headphones", prefix: "VE-AUD-HP", count: 180, pmin: 1999, pmax: 9999 },
  { cat: "audio", brand: "VoltEdge", label: "Neckband", prefix: "VE-AUD-NB", count: 140, pmin: 999, pmax: 3499 },
  { cat: "audio", brand: "VoltEdge", label: "Bluetooth Speaker", prefix: "VE-AUD-SP", count: 160, pmin: 1999, pmax: 8999 },
  { cat: "audio", brand: "VoltEdge", label: "Soundbar", prefix: "VE-AUD-SB", count: 80, pmin: 6999, pmax: 19999 },
  // ---- electronics / VoltEdge ----
  { cat: "electronics", brand: "VoltEdge", label: "Smart TV", prefix: "VE-ELC-TV", count: 180, pmin: 18999, pmax: 69999 },
  { cat: "electronics", brand: "VoltEdge", label: "Power Bank", prefix: "VE-ELC-PB", count: 180, pmin: 999, pmax: 3499 },
  { cat: "electronics", brand: "VoltEdge", label: "Smartwatch", prefix: "VE-ELC-SW", count: 200, pmin: 2499, pmax: 12999 },
  { cat: "electronics", brand: "VoltEdge", label: "Trimmer", prefix: "VE-ELC-TR", count: 140, pmin: 1299, pmax: 3999 },
  { cat: "electronics", brand: "VoltEdge", label: "Extension Board", prefix: "VE-ELC-EB", count: 120, pmin: 499, pmax: 1499 },
  // ---- men / UrbanThread ----
  { cat: "men", brand: "UrbanThread", label: "Casual Shirt", prefix: "UT-MEN-SH", count: 240, pmin: 999, pmax: 2999, variants: ["S", "M", "L", "XL"] },
  { cat: "men", brand: "UrbanThread", label: "T-Shirt", prefix: "UT-MEN-TS", count: 280, pmin: 499, pmax: 1499, variants: ["S", "M", "L", "XL"] },
  { cat: "men", brand: "UrbanThread", label: "Jeans", prefix: "UT-MEN-JN", count: 220, pmin: 1499, pmax: 3999, variants: ["30", "32", "34", "36"] },
  { cat: "men", brand: "UrbanThread", label: "Denim Jacket", prefix: "UT-MEN-DJ", count: 120, pmin: 2499, pmax: 5999, variants: ["S", "M", "L", "XL"] },
  { cat: "men", brand: "UrbanThread", label: "Sneakers", prefix: "UT-MEN-SN", count: 180, pmin: 1999, pmax: 5999, variants: ["UK 8", "UK 9", "UK 10", "UK 11"] },
  { cat: "men", brand: "UrbanThread", label: "Kurta", prefix: "UT-MEN-KU", count: 160, pmin: 1299, pmax: 3499, variants: ["S", "M", "L", "XL"] },
  // ---- women / UrbanThread ----
  { cat: "women", brand: "UrbanThread", label: "Summer Dress", prefix: "UT-WOM-DR", count: 240, pmin: 1299, pmax: 3999, variants: ["S", "M", "L"] },
  { cat: "women", brand: "UrbanThread", label: "Kurti", prefix: "UT-WOM-KU", count: 260, pmin: 799, pmax: 2799, variants: ["S", "M", "L", "XL"] },
  { cat: "women", brand: "UrbanThread", label: "Saree", prefix: "UT-WOM-SA", count: 180, pmin: 1499, pmax: 5999 },
  { cat: "women", brand: "UrbanThread", label: "Handbag", prefix: "UT-WOM-HB", count: 160, pmin: 1299, pmax: 4999 },
  { cat: "women", brand: "UrbanThread", label: "Blouse", prefix: "UT-WOM-BL", count: 140, pmin: 799, pmax: 2499, variants: ["S", "M", "L"] },
  { cat: "women", brand: "UrbanThread", label: "Ankle Heels", prefix: "UT-WOM-AH", count: 120, pmin: 1499, pmax: 3999, variants: ["UK 4", "UK 5", "UK 6", "UK 7"] },
  // ---- fashion / UrbanThread ----
  { cat: "fashion", brand: "UrbanThread", label: "Leather Belt", prefix: "UT-FAS-BL", count: 140, pmin: 599, pmax: 1999 },
  { cat: "fashion", brand: "UrbanThread", label: "Wallet", prefix: "UT-FAS-WL", count: 140, pmin: 499, pmax: 1799 },
  { cat: "fashion", brand: "UrbanThread", label: "Sunglasses", prefix: "UT-FAS-SG", count: 160, pmin: 899, pmax: 3499 },
  { cat: "fashion", brand: "UrbanThread", label: "Cap", prefix: "UT-FAS-CP", count: 120, pmin: 399, pmax: 1199 },
  // ---- kitchen / CasaNova ----
  { cat: "kitchen", brand: "CasaNova", label: "Cookware Set", prefix: "CN-KIT-CW", count: 160, pmin: 1999, pmax: 6999 },
  { cat: "kitchen", brand: "CasaNova", label: "Dinner Set", prefix: "CN-KIT-DN", count: 120, pmin: 2999, pmax: 8999 },
  { cat: "kitchen", brand: "CasaNova", label: "Chef Knife Set", prefix: "CN-KIT-KN", count: 100, pmin: 999, pmax: 3499 },
  { cat: "kitchen", brand: "CasaNova", label: "Storage Container Set", prefix: "CN-KIT-SC", count: 180, pmin: 499, pmax: 1999 },
  { cat: "kitchen", brand: "CasaNova", label: "Mixer Grinder", prefix: "CN-KIT-MG", count: 100, pmin: 3499, pmax: 8999 },
  { cat: "kitchen", brand: "CasaNova", label: "Electric Kettle", prefix: "CN-KIT-EK", count: 120, pmin: 1299, pmax: 3499 },
  // ---- furniture / CasaNova ----
  { cat: "furniture", brand: "CasaNova", label: "Lounge Chair", prefix: "CN-FUR-LC", count: 160, pmin: 5999, pmax: 19999 },
  { cat: "furniture", brand: "CasaNova", label: "Coffee Table", prefix: "CN-FUR-CT", count: 120, pmin: 3999, pmax: 12999 },
  { cat: "furniture", brand: "CasaNova", label: "Floor Lamp", prefix: "CN-FUR-FL", count: 140, pmin: 1499, pmax: 4999 },
  { cat: "furniture", brand: "CasaNova", label: "Bookshelf", prefix: "CN-FUR-BS", count: 120, pmin: 4999, pmax: 14999 },
  { cat: "furniture", brand: "CasaNova", label: "Sofa 3-Seater", prefix: "CN-FUR-SF", count: 80, pmin: 19999, pmax: 49999 },
  // ---- home / CasaNova ----
  { cat: "home", brand: "CasaNova", label: "King Bedsheet", prefix: "CN-HOM-KB", count: 220, pmin: 799, pmax: 2499 },
  { cat: "home", brand: "CasaNova", label: "Curtain Set", prefix: "CN-HOM-CU", count: 160, pmin: 999, pmax: 2999 },
  { cat: "home", brand: "CasaNova", label: "Cushion Covers", prefix: "CN-HOM-CC", count: 180, pmin: 399, pmax: 1299 },
  { cat: "home", brand: "CasaNova", label: "Wall Art Frame", prefix: "CN-HOM-WA", count: 120, pmin: 799, pmax: 2999 },
  { cat: "home", brand: "CasaNova", label: "Planter Pot", prefix: "CN-HOM-PP", count: 140, pmin: 499, pmax: 1799 },
  // ---- beauty / GlowKart ----
  { cat: "beauty", brand: "GlowKart", label: "Vitamin C Serum", prefix: "GK-BTY-VC", count: 220, pmin: 499, pmax: 1299 },
  { cat: "beauty", brand: "GlowKart", label: "Moisturizer", prefix: "GK-BTY-MO", count: 220, pmin: 399, pmax: 999 },
  { cat: "beauty", brand: "GlowKart", label: "Matte Lipstick", prefix: "GK-BTY-LP", count: 200, pmin: 299, pmax: 899 },
  { cat: "beauty", brand: "GlowKart", label: "Face Wash", prefix: "GK-BTY-FW", count: 180, pmin: 199, pmax: 599 },
  { cat: "beauty", brand: "GlowKart", label: "Shampoo", prefix: "GK-BTY-SH", count: 200, pmin: 299, pmax: 799 },
  { cat: "beauty", brand: "GlowKart", label: "Kajal Eyeliner", prefix: "GK-BTY-KJ", count: 120, pmin: 149, pmax: 499 },
  // ---- grocery / FreshDaily ----
  { cat: "grocery", brand: "FreshDaily", label: "Whole Wheat Atta", prefix: "FD-GRO-AT", count: 240, pmin: 250, pmax: 650, variants: ["5 kg", "10 kg"] },
  { cat: "grocery", brand: "FreshDaily", label: "Basmati Rice", prefix: "FD-GRO-RI", count: 240, pmin: 700, pmax: 1800, variants: ["5 kg", "10 kg"] },
  { cat: "grocery", brand: "FreshDaily", label: "Toor Dal", prefix: "FD-GRO-TD", count: 200, pmin: 150, pmax: 450, variants: ["1 kg", "2 kg"] },
  { cat: "grocery", brand: "FreshDaily", label: "Mustard Oil", prefix: "FD-GRO-MO", count: 180, pmin: 200, pmax: 500, variants: ["1 L", "2 L"] },
  { cat: "grocery", brand: "FreshDaily", label: "Masala Combo", prefix: "FD-GRO-MC", count: 240, pmin: 400, pmax: 999 },
  { cat: "grocery", brand: "FreshDaily", label: "Almonds", prefix: "FD-GRO-AL", count: 200, pmin: 700, pmax: 1500, variants: ["500 g", "1 kg"] },
  { cat: "grocery", brand: "FreshDaily", label: "Organic Honey", prefix: "FD-GRO-HN", count: 120, pmin: 300, pmax: 800, variants: ["250 g", "500 g"] },
  { cat: "grocery", brand: "FreshDaily", label: "Masala Chai", prefix: "FD-GRO-CH", count: 160, pmin: 200, pmax: 600, variants: ["250 g", "500 g"] },
];

function roundPrice(v: number): number {
  if (v < 1000) return Math.max(99, Math.round(v));
  return Math.max(99, Math.round(v / 10) * 10 - 1);
}

export function generateCatalog(): BulkProduct[] {
  const rng = mulberry32(20261015);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const out: BulkProduct[] = [];

  for (const line of LINES) {
    const descs = DESCS[line.cat] ?? DESCS.grocery;
    const colors = COLORS[line.cat] ?? ["6D28D9"];
    for (let i = 1; i <= line.count; i++) {
      const suffix = SUFFIXES[(i - 1) % SUFFIXES.length];
      const name = `${line.brand} ${line.label} ${i}${suffix ? ` ${suffix}` : ""}`;
      const sku = `${line.prefix}-${String(i).padStart(4, "0")}`;
      const price = roundPrice(line.pmin + rng() * (line.pmax - line.pmin));
      const discountPrice = rng() < 0.65 ? roundPrice(price * (0.78 + rng() * 0.14)) : null;
      const stock = 15 + Math.floor(rng() * 585);
      const rating = Math.round((3.9 + rng() * 0.9) * 10) / 10;
      const reviews = 12 + Math.floor(rng() * 840);
      const template = pick(descs);
      const description = template
        .replaceAll("{name}", name)
        .replaceAll("{brand}", line.brand)
        .replaceAll("{label}", line.label);

      let variants: BulkVariant[] | undefined;
      if (line.variants) {
        const per = Math.max(1, Math.floor(stock / line.variants.length));
        variants = line.variants.map((v, j) => ({
          name: v,
          sku: `${sku}-V${j + 1}`,
          stock: j === line.variants!.length - 1 ? Math.max(1, stock - per * (line.variants!.length - 1)) : per,
        }));
      }

      out.push({
        sku,
        name,
        description,
        category: line.cat,
        brand: line.brand,
        price,
        discountPrice: discountPrice != null && discountPrice < price ? discountPrice : null,
        stock,
        rating,
        reviews,
        color: pick(colors),
        variants,
      });
    }
  }
  return out;
}

// Self-check when run directly: `npx tsx prisma/catalog-generator.ts`
const isMain = process.argv[1]?.endsWith("catalog-generator.ts");
if (isMain) {
  const items = generateCatalog();
  const skus = new Set(items.map((p) => p.sku));
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  const slugs = new Set(items.map((p) => slugify(p.name)));
  const badPrice = items.filter((p) => p.discountPrice != null && p.discountPrice >= p.price);
  console.log(`products: ${items.length}`);
  console.log(`unique SKUs: ${skus.size} (ok: ${skus.size === items.length})`);
  console.log(`unique slugs: ${slugs.size} (ok: ${slugs.size === items.length})`);
  console.log(`bad discount rows: ${badPrice.length}`);
  console.log(`variants total: ${items.reduce((n, p) => n + (p.variants?.length ?? 0), 0)}`);
  console.log("sample:", items[0].sku, "|", items[0].name, "| ₹" + items[0].price);
}
