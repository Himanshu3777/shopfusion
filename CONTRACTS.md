# ShopFusion — Worker Contracts

Read this fully before writing any code. The coordinator owns shared core
(`src/lib/*`, `src/auth.ts`, Prisma schema, theme, UI primitives). You own ONLY
the files listed in your task brief. Never edit another worker's files or
shared core without asking the coordinator.

## Stack
Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL.
Auth: Auth.js v5 (next-auth@beta) Credentials provider, Prisma adapter,
database sessions. Passwords hashed with bcryptjs (12 rounds).

## Shared core (already exists — import, don't reimplement)

```ts
import { db } from "@/lib/db";                 // PrismaClient singleton
import { auth } from "@/auth";                 // NextAuth v5: (await auth())?.user -> { id, email, name, role }
import { ok, fail, unauthorized, forbidden, notFound } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/rbac"; // throw ApiError on failure
import { hashPassword, verifyPassword } from "@/lib/password";
import { calcCartTotals, applyCouponToSubtotal, computeDiscountPct, formatINR } from "@/lib/pricing";
import { createPayment, PaymentProvider } from "@/lib/payments";
import { sendMail } from "@/lib/email";         // mock: logs to console in dev
import { productCardSelect } from "@/lib/selects"; // shared Prisma select for product cards
import { canTransition, pushHistory, ORDER_STATUS_LABELS, TRACKING_STEPS } from "@/lib/orders";
import { OrderStatus, PaymentStatus, Role } from "@prisma/client";
```

- `ok(data, status=200)` → `NextResponse.json({ ok: true, data }, {status})`
- `fail(message, status=400, details?)` → `NextResponse.json({ ok: false, error: { message, details } }, {status})`
- `ApiError(status, message)` — throw inside handlers; each route wraps with try/catch or uses `withErrorHandling`.
- `requireUser()` returns session user or throws 401. `requireRole("ADMIN")` / `requireRole("SELLER")` throws 403. Sellers: user.role === "SELLER" AND sellerProfile.status === "APPROVED".
- Validation: zod schemas in `@/lib/validation`; use `schema.parse()` and convert ZodError → 422 via fail().
- Money: Prisma Decimal. Convert with `Number(x)` for math; NEVER trust client totals — recompute server-side in checkout.
- Order status changes: use `canTransition(from, to)` from `@/lib/orders`; record with `pushHistory()`; labels via `ORDER_STATUS_LABELS`; tracking UI via `TRACKING_STEPS`.
- Banned users: `user.isBanned` blocks login (already enforced in `src/auth.ts`); admin suspend = set `isBanned=true`.
- Test DB: tests run with `DATABASE_URL` env var pointed at the test database (set in vitest setup file before importing `@/lib/db`). Never touch dev data from tests.
- Pagination: `?page=1&limit=24` → `{ items, page, limit, total, totalPages }`.
- Dates: ISO strings. IDs: cuid strings. Slugs: lowercase-hyphen.

## API conventions
- Route files: `src/app/api/<resource>/route.ts` (GET/POST), `src/app/api/<resource>/[id]/route.ts` (GET/PATCH/DELETE).
  Handler signature: `export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> })` then `const { id } = await params`.
- Always `await auth()` first for protected routes.
- List endpoints support filtering/sorting/pagination per spec.
- Search: `GET /api/products/search?q=&category=&brand=&minPrice=&maxPrice=&minRating=&inStock=&onSale=&sort=` sort ∈ relevance|price-asc|price-desc|rating|newest|popularity. Debounce client-side (300ms).
- Product card payload: id, name, slug, price, discountPrice, discountPct, avgRating, reviewCount, stock, brand{name}, category{name,slug}, images[{url,alt}] (first only), seller{storeName}.
- Checkout `POST /api/checkout { addressId, couponCode?, paymentProvider: "MOCK" }`:
  1. Load cart (non-saved items), validate stock per item (product + variant).
  2. Recompute prices server-side; validate coupon (active, dates, min order, usage limit).
  3. shippingFee: free ≥ ₹499 else ₹49 (applied per order, on the order subtotal after discount share). tax: 0.
  4. Group cart lines by seller → create ONE Order per seller (each with its own orderNumber, items, price snapshots, address snapshot, coupon share). Discount from coupon is split proportionally across the seller orders. Create one Payment row per order (MOCK → auto PAID). Do all of this in a single Prisma transaction; decrement stock (product + variant); increment coupon usedCount once; clear purchased cart items.
  5. Return `{ orders: [{ id, orderNumber, total }] }`.
- Reviews: POST requires delivered order containing product (verified purchase) OR allow unverified with isVerifiedPurchase=false? Spec: only eligible customers per order history → require a DELIVERED order item for the product; else 403. One review per user per product (upsert). Recompute product avgRating/reviewCount after write.

## Pages conventions
- Server components by default; "use client" only for interactivity.
- Use `@/components/ui` primitives: Button, Card, Input, Badge, Modal, Toast (via ToastProvider), Spinner/Loading, EmptyState, ErrorState, Pagination, RatingStars, Price.
- Layout: `src/app/layout.tsx` already has header/footer + ToastProvider (core). Just build page content.
- Forms: controlled inputs + zod validation, loading + error states.
- Auth pages use `signIn("credentials", ...)` from `next-auth/react` (client) — see existing login page pattern if present.
- Protected pages: check session server-side via `auth()` and `redirect("/login")` if missing; role-gate similarly.

## Brand — ShopFusion (ORIGINAL, do not copy Amazon/Flipkart)
- Colors: primary violet `#6D28D9` (fusion-600), deep `#4C1D95`; accent amber `#F59E0B`; neutrals slate. Dark mode via `class` toggle already wired in core.
- Logo: SVG hexagon/cube mark + "ShopFusion" wordmark (component `@/components/Logo`, already in core).
- Typography: system stack + "Sora"/fallback for display (core CSS). Body: Inter-ish system.
- Radius: rounded-xl cards, rounded-full pills. No Amazon orange arrow, no Flipkart blue/yellow.

## What NOT to do
- No secrets in code; use `process.env`. No hardcoded product data as final DB (seed only).
- No `any` without justification; keep `tsc --noEmit` clean.
- Don't install new npm packages without coordinator approval.
- Don't run `next dev` on port 3000 concurrently with others (coordinate) — prefer `tsc --noEmit` for your files.
- Tests: don't write test files unless your brief says so (coordinator owns tests), but keep logic in pure testable functions where possible.
