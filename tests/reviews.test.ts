import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, createUser, createSeller, createCategory, createProduct, createAddress } from "./helpers";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as addToCart } from "@/app/api/cart/route";
import { GET as listReviews, POST as postReview } from "@/app/api/reviews/route";
import { PATCH as patchReview } from "@/app/api/reviews/[id]/route";
import { db } from "@/lib/db";
import { paramsOf } from "./helpers";

async function setup() {
  const user = await createUser();
  asUser(user);
  const seller = await createSeller();
  const cat = await createCategory();
  const product = await createProduct({ sellerId: seller.id, categoryId: cat.id, price: 1000, stock: 5 });
  return { user, seller, product };
}

async function buyAndDeliver(userId: string, productId: string) {
  await addToCart(req("/api/cart", { method: "POST", body: { productId, quantity: 1 } }));
  const address = await createAddress(userId);
  const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, paymentProvider: "MOCK" } }));
  const order = (await json(res)).data.orders[0];
  await db.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
  return order;
}

beforeEach(async () => {
  await resetDb();
});

describe("reviews", () => {
  it("rejects reviews without a delivered purchase", async () => {
    const { product } = await setup();
    const res = await postReview(req("/api/reviews", { method: "POST", body: { productId: product.id, rating: 5, title: "Great" } }));
    expect(res.status).toBe(403);
  });

  it("accepts a verified purchase review and updates aggregates", async () => {
    const { user, product } = await setup();
    await buyAndDeliver(user.id, product.id);
    const res = await postReview(req("/api/reviews", { method: "POST", body: { productId: product.id, rating: 4, title: "Good", body: "Works well" } }));
    expect(res.status).toBe(201);
    const j = await json(res);
    expect(j.data.isVerifiedPurchase).toBe(true);
    const p = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(p.reviewCount).toBe(1);
    expect(p.avgRating).toBe(4);
    const list = await json(await listReviews(req(`/api/reviews?productId=${product.id}`)));
    expect(list.data.items.length).toBe(1);
  });

  it("upserts one review per user and lets them edit it", async () => {
    const { user, product } = await setup();
    await buyAndDeliver(user.id, product.id);
    await postReview(req("/api/reviews", { method: "POST", body: { productId: product.id, rating: 4 } }));
    const again = await postReview(req("/api/reviews", { method: "POST", body: { productId: product.id, rating: 5 } }));
    const j = await json(again);
    const reviewId = j.data.id as string;
    const patched = await patchReview(req(`/api/reviews/${reviewId}`, { method: "PATCH", body: { rating: 3, title: "Meh" } }), paramsOf({ id: reviewId }));
    expect((await json(patched)).ok).toBe(true);
    const p = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(p.reviewCount).toBe(1);
    expect(p.avgRating).toBe(3);
  });
});
