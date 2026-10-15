import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, createUser, createSeller, createCategory, createProduct, paramsOf } from "./helpers";
import { GET as getCart, POST as addToCart } from "@/app/api/cart/route";
import { PATCH as patchItem, DELETE as deleteItem } from "@/app/api/cart/items/[id]/route";
import { GET as getWishlist, POST as addWishlist } from "@/app/api/wishlist/route";
import { DELETE as deleteWishlistItem } from "@/app/api/wishlist/items/[id]/route";
import { POST as moveToCart } from "@/app/api/wishlist/move/route";
import { db } from "@/lib/db";

let user: Awaited<ReturnType<typeof createUser>>;
let productId: string;

beforeEach(async () => {
  await resetDb();
  user = await createUser();
  asUser(user);
  const seller = await createSeller();
  const cat = await createCategory();
  const p = await createProduct({ sellerId: seller.id, categoryId: cat.id, price: 1000, discountPrice: 800, stock: 5 });
  productId = p.id;
});

describe("cart", () => {
  it("adds an item and returns server-computed summary", async () => {
    const res = await addToCart(req("/api/cart", { method: "POST", body: { productId, quantity: 2 } }));
    expect(res.status).toBe(201);
    const cart = await getCart(req("/api/cart"));
    const j = await json(cart);
    expect(j.data.items.length).toBe(1);
    expect(j.data.items[0].unitPrice).toBe(800); // discount price wins
    expect(j.data.summary.subtotal).toBe(1600);
    expect(j.data.summary.itemCount).toBe(2);
  });

  it("rejects quantity beyond stock", async () => {
    const res = await addToCart(req("/api/cart", { method: "POST", body: { productId, quantity: 99 } }));
    expect(res.status).toBe(400);
  });

  it("updates quantity and save-for-later", async () => {
    const added = await json(await addToCart(req("/api/cart", { method: "POST", body: { productId, quantity: 1 } })));
    const itemId = added.data.id as string;
    const patched = await patchItem(req(`/api/cart/items/${itemId}`, { method: "PATCH", body: { quantity: 3 } }), paramsOf({ id: itemId }));
    expect((await json(patched)).ok).toBe(true);
    const saved = await patchItem(req(`/api/cart/items/${itemId}`, { method: "PATCH", body: { savedForLater: true } }), paramsOf({ id: itemId }));
    expect((await json(saved)).ok).toBe(true);
    // saved-for-later items are excluded from the purchasable summary
    const cart = await json(await getCart(req("/api/cart")));
    expect(cart.data.summary.itemCount).toBe(0);
    const removed = await deleteItem(req(`/api/cart/items/${itemId}`, { method: "DELETE" }), paramsOf({ id: itemId }));
    expect((await json(removed)).ok).toBe(true);
  });

  it("previews coupon without persisting", async () => {
    await db.coupon.create({ data: { code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10, minOrderValue: 100, isActive: true, validFrom: new Date("2020-01-01") } });
    await addToCart(req("/api/cart", { method: "POST", body: { productId, quantity: 2 } }));
    const cart = await json(await getCart(req("/api/cart?coupon=SAVE10")));
    expect(cart.data.coupon.discount).toBe(160); // 10% of 1600
    expect(cart.data.summary.discount).toBe(160);
  });
});

describe("wishlist", () => {
  it("adds, moves to cart, and removes", async () => {
    const added = await addWishlist(req("/api/wishlist", { method: "POST", body: { productId } }));
    expect([200, 201]).toContain(added.status);
    const moved = await moveToCart(req("/api/wishlist/move", { method: "POST", body: { productId } }));
    expect((await json(moved)).ok).toBe(true);
    const cart = await json(await getCart(req("/api/cart")));
    expect(cart.data.items.length).toBe(1);
    const wl = await json(await getWishlist());
    expect(wl.data.items.length).toBe(0);
  });

  it("deletes a wishlist item", async () => {
    const added = await json(await addWishlist(req("/api/wishlist", { method: "POST", body: { productId } })));
    const itemId = added.data.id as string;
    const del = await deleteWishlistItem(req(`/api/wishlist/items/${itemId}`, { method: "DELETE" }), paramsOf({ id: itemId }));
    expect((await json(del)).ok).toBe(true);
  });
});
