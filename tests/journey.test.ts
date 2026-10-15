/**
 * End-to-end journey (API level): register → search → add to cart →
 * checkout → place order → view order → track → cancel.
 * Covers the critical user path without a browser dependency.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, paramsOf } from "./helpers";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as searchProducts } from "@/app/api/products/search/route";
import { POST as addToCart } from "@/app/api/cart/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { GET as orderDetail } from "@/app/api/orders/[id]/route";
import { POST as cancelOrder } from "@/app/api/orders/[id]/cancel/route";
import { POST as createAddress } from "@/app/api/addresses/route";
import { db } from "@/lib/db";

beforeEach(async () => {
  await resetDb();
});

describe("journey: register to cancelled order", () => {
  it("completes the full flow", async () => {
    // 1. register
    const reg = await register(req("/api/auth/register", { method: "POST", body: { name: "Journey", email: "journey@test.dev", password: "Password@123" } }));
    expect(reg.status).toBe(201);
    const user = (await json(reg)).data.user;
    asUser({ id: user.id, email: user.email, name: user.name, role: "CUSTOMER" });

    // 2. search (seeded catalog from worker 4's seed is in dev DB; here use test DB fixture)
    const sellerUser = await db.user.create({ data: { name: "S", email: "s@test.dev", passwordHash: "x", role: "SELLER", cart: { create: {} }, wishlist: { create: {} } } });
    const seller = await db.seller.create({ data: { userId: sellerUser.id, storeName: "S", storeSlug: "s-journey", status: "APPROVED" } });
    const cat = await db.category.create({ data: { name: "Electronics", slug: "electronics-journey" } });
    const product = await db.product.create({
      data: { name: "Journey Headphones", slug: "journey-headphones", description: "Great sound", sku: "SKU-J1", price: 2999, discountPrice: 1999, stock: 10, categoryId: cat.id, sellerId: seller.id, images: { create: [{ url: "https://placehold.co/600", position: 0 }] } },
    });

    const search = await searchProducts(req("/api/products/search?q=headphones"));
    const found = (await json(search)).data.items;
    expect(found.length).toBe(1);
    expect(found[0].slug).toBe("journey-headphones");

    // 3. add to cart
    const added = await addToCart(req("/api/cart", { method: "POST", body: { productId: product.id, quantity: 2 } }));
    expect(added.status).toBe(201);

    // 4. create address
    const addrRes = await createAddress(req("/api/addresses", { method: "POST", body: { fullName: "Journey", phone: "9999999999", line1: "1 Main St", city: "Noida", state: "UP", postalCode: "201301" } }));
    const address = (await json(addrRes)).data;

    // 5. checkout → place order
    const co = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, paymentProvider: "MOCK" } }));
    expect(co.status).toBe(201);
    const orders = (await json(co)).data.orders;
    expect(orders.length).toBe(1);
    // 2 × 1999 = 3998, free shipping
    expect(Number(orders[0].total)).toBe(3998);

    // 6. view + track order
    const detail = await json(await orderDetail(req(`/api/orders/${orders[0].id}`), paramsOf({ id: orders[0].id })));
    expect(detail.data.status).toBe("PENDING");
    expect(detail.data.payment.status).toBe("PAID");

    // 7. cancel
    const cancelled = await cancelOrder(req(`/api/orders/${orders[0].id}/cancel`, { method: "POST" }), paramsOf({ id: orders[0].id }));
    expect((await json(cancelled)).ok).toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { id: orders[0].id } })).status).toBe("CANCELLED");
  });
});
