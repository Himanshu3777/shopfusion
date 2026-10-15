/**
 * Integration test helpers. Runs against the isolated test database
 * (vitest.setup.ts points DATABASE_URL at DATABASE_URL_TEST).
 */
import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { Role } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/auth";
type MockAuthFn = () => Promise<{ user: TestUser; expires: string } | null>;
const mockAuth = vi.mocked(auth as unknown as MockAuthFn);

export type TestUser = { id: string; email: string; name: string | null; role: Role };

export function asUser(u: TestUser | null) {
  mockAuth.mockResolvedValue(u ? { user: u, expires: new Date(Date.now() + 3600e3).toISOString() } : null);
}
export function asGuest() {
  asUser(null);
}

const TABLES = [
  "Notification", "Review", "Payment", "OrderItem", "Order",
  "Coupon", "CartItem", "Cart", "WishlistItem", "Wishlist",
  "Address", "ProductVariant", "ProductImage", "Product",
  "Seller", "Brand", "Category", "PasswordResetToken",
  "Session", "Account", "VerificationToken", "User",
];

/** Wipe all data (respecting FKs via CASCADE). */
export async function resetDb() {
  for (const t of TABLES) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
  }
  asGuest();
}

let seq = 0;
const uid = () => `t${Date.now()}${seq++}`;

export async function createUser(role: Role = "CUSTOMER", email?: string): Promise<TestUser> {
  const em = email ?? `${uid()}@test.dev`;
  const user = await db.user.create({
    data: {
      name: "Test User",
      email: em,
      passwordHash: await hashPassword("Password@123"),
      role,
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function createSeller(userId?: string, status: "APPROVED" | "PENDING" = "APPROVED") {
  const u = userId ? await db.user.findUniqueOrThrow({ where: { id: userId } }) : await db.user.create({
    data: { name: "Seller", email: `${uid()}@test.dev`, passwordHash: await hashPassword("x"), role: "SELLER", cart: { create: {} }, wishlist: { create: {} } },
  });
  const n = uid();
  return db.seller.create({
    data: { userId: u.id, storeName: `Store ${n}`, storeSlug: `store-${n}`, status },
  });
}

export async function createCategory(name?: string, parentId?: string | null) {
  const n = name ?? `Category ${uid()}`;
  const slug = n.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid();
  return db.category.create({ data: { name: n, slug, parentId: parentId ?? null } });
}

export async function createBrand(name?: string) {
  const n = name ?? `Brand ${uid()}`;
  return db.brand.create({ data: { name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid() } });
}

export async function createProduct(opts: {
  sellerId: string;
  categoryId: string;
  brandId?: string;
  price?: number;
  discountPrice?: number | null;
  stock?: number;
  name?: string;
}) {
  const n = opts.name ?? `Product ${uid()}`;
  const slug = n.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid();
  return db.product.create({
    data: {
      name: n,
      slug,
      description: "A fine test product",
      sku: `SKU-${uid()}`,
      price: opts.price ?? 1000,
      discountPrice: opts.discountPrice ?? null,
      stock: opts.stock ?? 10,
      categoryId: opts.categoryId,
      brandId: opts.brandId,
      sellerId: opts.sellerId,
      images: { create: [{ url: "https://placehold.co/600x600", position: 0 }] },
    },
  });
}

export async function createAddress(userId: string, isDefault = true) {
  return db.address.create({
    data: {
      userId, label: "Home", fullName: "Test User", phone: "9999999999",
      line1: "123 Test St", city: "Noida", state: "UP", postalCode: "201301",
      country: "India", isDefault,
    },
  });
}

export async function createCoupon(code = "TEST10", discountValue = 10) {
  return db.coupon.create({
    data: {
      code, discountType: "PERCENTAGE", discountValue,
      minOrderValue: 100, maxDiscount: 500, isActive: true,
      validFrom: new Date("2020-01-01"), validUntil: new Date("2030-01-01"),
    },
  });
}

/** Build a NextRequest for handler tests. */
export function req(path: string, init?: { method?: string; body?: unknown; params?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  return new NextRequest(url, {
    method: init?.method ?? "GET",
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
  });
}

export const paramsOf = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

export async function json(res: Response) {
  return res.json();
}
