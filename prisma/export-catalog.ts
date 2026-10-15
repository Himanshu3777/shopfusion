/**
 * Catalog export script — dumps every product (curated + generated) as JSON.
 * Pure data, no DB access. Run: `npx tsx prisma/export-catalog.ts > /tmp/catalog.json`
 */
import { PRODUCTS, ph } from "./catalog-data";
import { generateCatalog } from "./catalog-generator";

interface Row {
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  discountPrice: number | null;
  rating: number;
  reviews: number;
  stock: number;
  imageUrl: string;
}

const rows: Row[] = [];

// Curated products (same 24 as production seed)
for (const p of PRODUCTS) {
  rows.push({
    name: p.name,
    sku: p.sku,
    category: p.category,
    brand: p.brand,
    price: p.price,
    discountPrice: p.discountPrice ?? null,
    rating: p.rating,
    reviews: p.reviews,
    stock: p.stock,
    imageUrl: ph(p.name, p.color),
  });
}

// Generated bulk catalog (same 11,300 as production seed)
for (const p of generateCatalog()) {
  rows.push({
    name: p.name,
    sku: p.sku,
    category: p.category,
    brand: p.brand,
    price: p.price,
    discountPrice: p.discountPrice,
    rating: p.rating,
    reviews: p.reviews,
    stock: p.stock,
    imageUrl: ph(p.name, p.color),
  });
}

process.stdout.write(JSON.stringify(rows));
console.error(`exported ${rows.length} products`);
