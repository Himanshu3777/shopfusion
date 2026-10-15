import { describe, it, expect } from "vitest";
import { canTransition, pushHistory, ORDER_STATUS_LABELS, TRACKING_STEPS } from "./orders";

describe("canTransition", () => {
  it("allows the happy path", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });
  it("allows cancellation from early states", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canTransition("PROCESSING", "CANCELLED")).toBe(true);
  });
  it("allows returns from delivered", () => {
    expect(canTransition("DELIVERED", "RETURNED")).toBe(true);
  });
  it("blocks invalid jumps and terminal states", () => {
    expect(canTransition("PENDING", "DELIVERED")).toBe(false);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
    expect(canTransition("RETURNED", "DELIVERED")).toBe(false);
  });
});

describe("pushHistory", () => {
  it("appends events with timestamps", () => {
    const h = pushHistory(undefined, "CONFIRMED", "Payment received");
    expect(h).toHaveLength(1);
    expect(h[0].status).toBe("CONFIRMED");
    expect(h[0].note).toBe("Payment received");
    expect(typeof h[0].at).toBe("string");
    const h2 = pushHistory(h, "SHIPPED");
    expect(h2).toHaveLength(2);
  });
});

describe("labels & tracking steps", () => {
  it("covers every status", () => {
    for (const s of TRACKING_STEPS) expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
    expect(ORDER_STATUS_LABELS.CANCELLED).toBe("Cancelled");
  });
});
