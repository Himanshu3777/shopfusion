import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, createUser, createSeller, createCategory, createProduct, createAddress, paramsOf } from "./helpers";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as addToCart } from "@/app/api/cart/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { GET as orderDetail } from "@/app/api/orders/[id]/route";
import { POST as cancelOrder } from "@/app/api/orders/[id]/cancel/route";
import { PATCH as sellerUpdateOrder } from "@/app/api/seller/orders/[id]/route";
import { db } from "@/lib/db";

async function placeOrder() {
  const user = await createUser();
  asUser(user);
  const seller = await createSeller();
  const sellerUser = await db.user.findUniqueOrThrow({ where: { id: seller.userId } });
  const cat = await createCategory();
  const p = await createProduct({ sellerId: seller.id, categoryId: cat.id, price: 1000, stock: 5 });
  await addToCart(req("/api/cart", { method: "POST", body: { productId: p.id, quantity: 2 } }));
  const address = await createAddress(user.id);
  const res = await checkout(req("/api/checkout", { method: "POST", body: { addressId: address.id, paymentProvider: "MOCK" } }));
  const j = await json(res);
  return { user, seller, sellerUser: { id: sellerUser.id, email: sellerUser.email, name: sellerUser.name, role: sellerUser.role as "SELLER" }, order: j.data.orders[0], product: p };
}

beforeEach(async () => {
  await resetDb();
});

describe("orders", () => {
  it("lists and shows detail for the owner", async () => {
    const { user, order } = await placeOrder();
    asUser(user);
    const list = await json(await listOrders(req("/api/orders")));
    expect(list.data.items.length).toBe(1);
    const detail = await json(await orderDetail(req(`/api/orders/${order.id}`), paramsOf({ id: order.id })));
    expect(detail.data.orderNumber).toBe(order.orderNumber);
    expect(detail.data.items.length).toBe(1);
    expect(detail.data.payment.status).toBe("PAID");
  });

  it("hides other users' orders", async () => {
    const { order } = await placeOrder();
    const stranger = await createUser();
    asUser(stranger);
    const res = await orderDetail(req(`/api/orders/${order.id}`), paramsOf({ id: order.id }));
    expect(res.status).toBe(404);
  });

  it("cancels and restocks", async () => {
    const { user, order, product } = await placeOrder();
    asUser(user);
    const res = await cancelOrder(req(`/api/orders/${order.id}/cancel`, { method: "POST" }), paramsOf({ id: order.id }));
    expect((await json(res)).ok).toBe(true);
    const row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.status).toBe("CANCELLED");
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(5);
  });

  it("seller advances status through the state machine", async () => {
    const { sellerUser, order } = await placeOrder();
    asUser(sellerUser);
    const r1 = await sellerUpdateOrder(req(`/api/seller/orders/${order.id}`, { method: "PATCH", body: { status: "CONFIRMED" } }), paramsOf({ id: order.id }));
    expect((await json(r1)).ok).toBe(true);
    // invalid jump is rejected
    const r2 = await sellerUpdateOrder(req(`/api/seller/orders/${order.id}`, { method: "PATCH", body: { status: "DELIVERED" } }), paramsOf({ id: order.id }));
    expect(r2.status).toBe(400);
  });
});
