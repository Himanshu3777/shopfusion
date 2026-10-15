import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, createUser, createSeller, createCategory, createProduct, createAddress, createCoupon } from "./helpers";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as addToCart } from "@/app/api/cart/route";
import { db } from "@/lib/db";

beforeEach(async () => {
  await resetDb();
});

async function setupTwoSellerCart() {
  const user = await createUser();
  asUser(user);
  const s1 = await createSeller();
  const s2 = await createSeller();
  const cat = await createCategory();
  const p1 = await createProduct({ sellerId: s1.id, categoryId: cat.id, price: 1000, stock: 10 }); // 1000
  const p2 = await createProduct({ sellerId: s2.id, categoryId: cat.id, price: 2000, discountPrice: 1500, stock: 10 }); // 1500
  await addToCart(req("/api/cart", { method: "POST", body: { productId: p1.id, quantity: 1 } }));
  await addToCart(req("/api/cart", { method: "POST", body: { productId: p2.id, quantity: 2 } }));
  const address = await createAddress(user.id);
  return { user, address, p1, p2 };
}

describe("POST /api/checkout", () => {
  it("splits one order per seller with server-computed totals", async () => {
    const { address, p1, p2 } = await setupTwoSellerCart();
    const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, paymentProvider: "MOCK" } }));
    expect(res.status).toBe(201);
    const j = await json(res);
    expect(j.data.orders.length).toBe(2);

    const totals = j.data.orders.map((o: { total: string }) => Number(o.total)).sort((a: number, b: number) => a - b);
    // order1: 1000 → free shipping (≥499). order2: 3000 → free shipping.
    expect(totals).toEqual([1000, 3000]);

    // stock decremented
    expect((await db.product.findUniqueOrThrow({ where: { id: p1.id } })).stock).toBe(9);
    expect((await db.product.findUniqueOrThrow({ where: { id: p2.id } })).stock).toBe(8);

    // payments auto-paid in MOCK mode
    const payments = await db.payment.findMany();
    expect(payments.length).toBe(2);
    expect(payments.every((p) => p.status === "PAID")).toBe(true);

    // cart cleared
    const cart = await db.cart.findFirstOrThrow({ where: { userId: j.data.orders[0].userId }, include: { items: true } });
    expect(cart.items.length).toBe(0);
  });

  it("applies coupon and splits discount proportionally", async () => {
    const { address } = await setupTwoSellerCart();
    await createCoupon("TEST10", 10);
    const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, couponCode: "TEST10", paymentProvider: "MOCK" } }));
    expect(res.status).toBe(201);
    const j = await json(res);
    const dbOrders = await db.order.findMany({ where: { id: { in: j.data.orders.map((o: { id: string }) => o.id) } } });
    const totalDiscount = dbOrders.reduce((a, o) => a + Number(o.discount), 0);
    // subtotal 4000 → 10% = 400
    expect(totalDiscount).toBe(400);
    const coupon = await db.coupon.findUniqueOrThrow({ where: { code: "TEST10" } });
    expect(coupon.usedCount).toBe(1);
  });

  it("rejects when stock is insufficient", async () => {
    const user = await createUser();
    asUser(user);
    const s = await createSeller();
    const cat = await createCategory();
    const p = await createProduct({ sellerId: s.id, categoryId: cat.id, price: 500, stock: 1 });
    await addToCart(req("/api/cart", { method: "POST", body: { productId: p.id, quantity: 1 } }));
    await db.product.update({ where: { id: p.id }, data: { stock: 0 } }); // sold out after adding
    const address = await createAddress(user.id);
    const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, paymentProvider: "MOCK" } }));
    expect(res.status).toBe(400);
    expect((await db.order.count())).toBe(0);
  });

  it("rejects invalid coupon", async () => {
    const { address } = await setupTwoSellerCart();
    const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, couponCode: "NOPE", paymentProvider: "MOCK" } }));
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: "x", paymentProvider: "MOCK" } }));
    expect(res.status).toBe(401);
  });
});
