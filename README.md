# ShopFusion

An original, production-ready e-commerce marketplace — discover, shop and sell with confidence.
Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL and Auth.js.

> **Brand note:** ShopFusion has an original brand identity (violet/amber, hexagon mark).
> It is *inspired by* modern marketplace UX patterns but does not copy any existing
> marketplace's branding, logos, or proprietary assets.

## Features

**Storefront**
- Home with hero banners, featured categories, trending, best sellers, deals, recently viewed
- Product listing with keyword search (debounced), category/brand/price/rating/stock/sale filters, 6 sort orders
- Product detail: image gallery, variants, specs, rating summary, verified-purchase reviews, related products
- Deals page, category pages, static pages (About, Contact, Shipping, Returns, Privacy, Terms)

**Commerce**
- Cart with quantity steppers, save-for-later, coupon validation, server-recomputed totals
- Wishlist with move-to-cart
- Multi-step checkout: address → summary → payment → confirmation (all totals validated server-side; client totals never trusted)
- Orders with full lifecycle (Pending → Confirmed → Processing → Shipped → Out for delivery → Delivered, plus Cancelled/Returned) and tracking timeline
- Reviews restricted to verified purchasers, one per user/product, aggregated ratings, anti-spam throttle

**Accounts & roles**
- Email/password auth (bcrypt, Auth.js database sessions), forgot/reset password via token email (mock in dev)
- Roles: CUSTOMER, SELLER, ADMIN with route + API-level RBAC; banned-user suspension

**Seller dashboard** — product CRUD with images/variants, inventory, order management with status transitions, sales analytics
**Admin dashboard** — users, seller approvals, products, categories/brands, orders, coupons, reviews, banners, platform analytics

**Engineering**
- Prisma + PostgreSQL with normalized schema, indexes, unique constraints
- Zod validation on every write endpoint; consistent `{ ok, data } / { ok:false, error }` API envelopes
- Payment abstraction (`src/lib/payments.ts`): safe MOCK provider for dev; Stripe/Razorpay integration points via env only
- Unit + integration tests (Vitest); ESLint; `tsc --noEmit`; production `next build`

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js Route Handlers (API routes) |
| Database | PostgreSQL 16, Prisma ORM v7 |
| Auth | Auth.js v5 (Credentials provider, Prisma adapter, bcryptjs) |
| Validation | Zod |
| Tests | Vitest |

### Architecture decisions
- **Monolith (Next.js full-stack)** over split frontend/backend: one deployable, shared types, simpler ops for this scale.
- **Database sessions** (Auth.js) over JWT: instant revocation, works with the Prisma adapter.
- **Per-seller orders**: checkout splits a cart into one order per seller so sellers only ever see their own orders.
- **Money as integer rupees** in business logic; Prisma `Decimal(12,2)` at the boundary.
- **Payments behind an interface**: `PaymentGateway` — MOCK in dev, real providers added without touching checkout logic.

## Folder structure

```
shopfusion/
├── prisma/
│   ├── schema.prisma      # full data model
│   ├── migrations/        # SQL migrations (source of truth)
│   └── seed.ts            # idempotent SAMPLE data (dev only)
├── src/
│   ├── app/               # routes: pages + API route handlers
│   │   └── api/           # /api/auth, /api/products, /api/cart, /api/checkout,
│   │                      # /api/orders, /api/reviews, /api/seller, /api/admin, ...
│   ├── components/        # UI primitives (ui.tsx), Logo, Header, Footer, ProductCard, ...
│   ├── lib/               # db, api envelopes, rbac, pricing, payments, orders, email, validation
│   ├── auth.ts            # Auth.js config
│   └── middleware.ts      # route protection
├── tests/                 # integration tests (isolated test DB)
├── vitest.config.ts
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+ (local or hosted)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and AUTH_SECRET.
# Generate a secret: npx auth secret

# 3. Create databases
createdb shopfusion_dev
createdb shopfusion_test
# (or: psql -c "CREATE DATABASE shopfusion_dev;" etc.)

# 4. Run migrations
npx prisma migrate dev

# 5. Seed SAMPLE data (dev only)
npm run db:seed

# 6. Start the dev server
npm run dev
# → http://localhost:3000
```

## Environment variables

See `.env.example` for the full documented list. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Prisma connection string (dev/prod) |
| `DATABASE_URL_TEST` | yes (tests) | Isolated database wiped by the test suite |
| `AUTH_SECRET` | yes | Auth.js session encryption (`npx auth secret`) |
| `NEXT_PUBLIC_APP_URL` | yes | Base URL for emails/metadata |
| `PAYMENT_PROVIDER` | no | `MOCK` (default, safe) \| `STRIPE` \| `RAZORPAY` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | prod | Stripe keys — never commit |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | prod | Razorpay keys — never commit |

## Test accounts (seeded, dev only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shopfusion.dev` | `Admin@123!` |
| Seller (approved, store "TechBazaar") | `seller@shopfusion.dev` | `Seller@123!` |
| Customer | `customer@shopfusion.dev` | `Customer@123!` |

> Change or remove these before any production use. The seed script is idempotent.

## Testing

```bash
npm test            # unit + integration (uses DATABASE_URL_TEST, wiped each run)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
```

Integration tests exercise the real API route handlers against a migrated test database:
auth (register/login/me), products (CRUD, search, filters), cart, checkout (incl. coupon + stock validation),
orders (cancel, status transitions), reviews (verified-purchase gate).

The full user journey (register → login → search → add to cart → checkout → place order → view order)
is covered as an integration test in `tests/journey.test.ts`. (Playwright E2E was intentionally
not added: the API-level journey covers the same paths without a browser dependency.)

## API overview

All responses: `{ ok: true, data }` or `{ ok: false, error: { message, details? } }`.

```
POST /api/auth/register        POST /api/auth/forgot-password
POST /api/auth/reset-password  GET  /api/auth/me   PATCH /api/auth/me

GET  /api/products?q=&category=&brand=&minPrice=&maxPrice=&minRating=&inStock=&onSale=&sort=&page=
GET  /api/products/search       GET /api/products/[slug]
GET  /api/categories            GET /api/brands            GET /api/banners

GET/POST            /api/cart                 PATCH/DELETE /api/cart/items/[id]
GET/POST            /api/wishlist             DELETE /api/wishlist/items/[id]
GET/POST            /api/addresses            PATCH/DELETE /api/addresses/[id]
POST                /api/coupons/validate     POST /api/checkout
GET                 /api/orders               GET  /api/orders/[id]
POST                /api/orders/[id]/cancel
GET/POST            /api/reviews              PATCH/DELETE /api/reviews/[id]

POST /api/seller/register      GET/PATCH /api/seller/profile
GET/POST /api/seller/products  GET/PATCH/DELETE /api/seller/products/[id]
GET /api/seller/orders         PATCH /api/seller/orders/[id]   GET /api/seller/analytics

GET /api/admin/users           PATCH/DELETE /api/admin/users/[id]
GET /api/admin/sellers         PATCH /api/admin/sellers/[id]
GET /api/admin/products        PATCH/DELETE /api/admin/products/[id]
GET /api/admin/orders          PATCH /api/admin/orders/[id]
GET/POST /api/admin/coupons    PATCH/DELETE /api/admin/coupons/[id]
GET /api/admin/reviews         DELETE /api/admin/reviews/[id]
GET/POST /api/admin/banners    PATCH/DELETE /api/admin/banners/[id]
GET /api/admin/analytics
```

## Deployment

1. Provision PostgreSQL (e.g. Railway, Render, Supabase, AWS RDS).
2. Set env vars on the host: `DATABASE_URL`, `AUTH_SECRET` (fresh `npx auth secret`), `NEXT_PUBLIC_APP_URL` (your domain), `PAYMENT_PROVIDER=MOCK` until real keys are configured.
3. Build command: `npm run build`. Start: `npm start`.
4. Run migrations against prod DB: `npx prisma migrate deploy` (with prod `DATABASE_URL`).
5. Do **not** run `db:seed` in production (sample data). Create the first admin via `POST /api/auth/register` then promote with `PATCH /api/admin/users/[id]` `{ "role": "ADMIN" }` from a DB console, or a one-off script.

Vercel is the simplest target for the Next.js app; any Node host works.

## Git workflow

Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `perf:`). Never commit `.env` or secrets —
verify with `git status` and a quick scan before pushing.

## Known limitations

- Payments run in MOCK mode (no real money). Stripe/Razorpay need gateway implementations + keys.
- Product images: URL-based; no object-storage upload pipeline yet (upload architecture validated by type/size, storage provider TBD).
- Email is mocked (console log) in dev; production mailer not wired.
- Search is database `contains` queries — fine at this scale; a dedicated search engine (e.g. Postgres full-text/Trigram or Meilisearch) is the next step for large catalogs.
- No Playwright E2E; journey covered at API integration level.
