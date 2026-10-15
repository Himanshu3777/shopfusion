import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, createUser, createSeller, createCategory, createBrand, createProduct, paramsOf } from "./helpers";
import { GET as listProducts } from "@/app/api/products/route";
import { GET as searchProducts } from "@/app/api/products/search/route";
import { GET as productDetail } from "@/app/api/products/[slug]/route";
import { GET as listCategories } from "@/app/api/categories/route";
import { POST as createCategoryAdmin } from "@/app/api/categories/route";

let sellerId: string; let catId: string; let brandId: string;

beforeEach(async () => {
  await resetDb();
  const s = await createSeller();
  sellerId = s.id;
  catId = (await createCategory("Electronics")).id;
  brandId = (await createBrand("VoltEdge")).id;
  await createProduct({ sellerId, categoryId: catId, brandId, name: "Alpha Phone", price: 20000, discountPrice: 15999, stock: 5 });
  await createProduct({ sellerId, categoryId: catId, brandId, name: "Beta Phone", price: 12000, stock: 0 });
});

describe("GET /api/products", () => {
  it("lists active products with card payload", async () => {
    const res = await listProducts(req("/api/products"));
    const j = await json(res);
    expect(j.ok).toBe(true);
    expect(j.data.items.length).toBe(2);
    expect(j.data.total).toBe(2);
    const card = j.data.items[0];
    expect(card).toHaveProperty("slug");
    expect(card).toHaveProperty("brand");
  });
  it("filters by search query and stock", async () => {
    const res = await listProducts(req("/api/products?q=alpha&inStock=true"));
    const j = await json(res);
    expect(j.data.items.length).toBe(1);
    expect(j.data.items[0].name).toBe("Alpha Phone");
  });
  it("filters on-sale and sorts price ascending", async () => {
    const res = await listProducts(req("/api/products?onSale=true&sort=price-asc"));
    const j = await json(res);
    expect(j.data.items.length).toBe(1);
    expect(j.data.items[0].name).toBe("Alpha Phone");
    const res2 = await listProducts(req("/api/products?sort=price-desc"));
    const j2 = await json(res2);
    expect(Number(j2.data.items[0].price)).toBeGreaterThanOrEqual(Number(j2.data.items[1].price));
  });
  it("paginates", async () => {
    const res = await listProducts(req("/api/products?limit=1&page=2"));
    const j = await json(res);
    expect(j.data.items.length).toBe(1);
    expect(j.data.page).toBe(2);
    expect(j.data.totalPages).toBe(2);
  });
});

describe("GET /api/products/search", () => {
  it("requires q", async () => {
    const res = await searchProducts(req("/api/products/search"));
    expect(res.status).toBe(400);
  });
  it("finds by keyword", async () => {
    const res = await searchProducts(req("/api/products/search?q=phone"));
    const j = await json(res);
    expect(j.data.total).toBe(2);
  });
});

describe("GET /api/products/[slug]", () => {
  it("returns full detail", async () => {
    const p = await createProduct({ sellerId, categoryId: catId, name: "Detail Gadget", price: 5000 });
    const res = await productDetail(req(`/api/products/${p.slug}`), paramsOf({ slug: p.slug }));
    const j = await json(res);
    expect(j.ok).toBe(true);
    expect(j.data.name).toBe("Detail Gadget");
    expect(j.data.related).toBeDefined();
  });
  it("404s unknown slug", async () => {
    const res = await productDetail(req("/api/products/nope"), paramsOf({ slug: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("categories RBAC", () => {
  it("lets anyone read, only admins write", async () => {
    const list = await listCategories();
    expect((await json(list)).ok).toBe(true);
    const customer = await createUser();
    asUser(customer);
    const denied = await createCategoryAdmin(req("/api/categories", { method: "POST", body: { name: "Nope" } }));
    expect(denied.status).toBe(403);
    const admin = await createUser("ADMIN");
    asUser(admin);
    const allowed = await createCategoryAdmin(req("/api/categories", { method: "POST", body: { name: "New Cat" } }));
    expect(allowed.status).toBe(201);
  });
});
