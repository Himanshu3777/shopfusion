import { describe, it, expect } from "vitest";
import {
  computeDiscountPct,
  effectivePrice,
  validateCoupon,
  couponDiscount,
  shippingFeeFor,
  calcTotals,
  formatINR,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
  type CouponLike,
} from "./pricing";

const baseCoupon: CouponLike = {
  code: "WELCOME10",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minOrderValue: 999,
  maxDiscount: 500,
  isActive: true,
  validFrom: new Date("2020-01-01"),
  validUntil: new Date("2030-01-01"),
  usageLimit: 100,
  usedCount: 0,
};

describe("computeDiscountPct", () => {
  it("computes whole-number discount", () => {
    expect(computeDiscountPct(1000, 799)).toBe(20);
  });
  it("returns 0 when no discount price", () => {
    expect(computeDiscountPct(1000)).toBe(0);
    expect(computeDiscountPct(1000, null)).toBe(0);
  });
  it("returns 0 when discount price is invalid", () => {
    expect(computeDiscountPct(1000, 1200)).toBe(0);
    expect(computeDiscountPct(0, 0)).toBe(0);
  });
});

describe("effectivePrice", () => {
  it("prefers valid discount price", () => {
    expect(effectivePrice(1000, 799)).toBe(799);
  });
  it("falls back to price", () => {
    expect(effectivePrice(1000)).toBe(1000);
    expect(effectivePrice(1000, 1200)).toBe(1000);
  });
});

describe("validateCoupon", () => {
  it("accepts a valid coupon", () => {
    expect(validateCoupon(baseCoupon, 1500)).toBeNull();
  });
  it("rejects inactive / expired / not-yet-valid", () => {
    expect(validateCoupon({ ...baseCoupon, isActive: false }, 1500)).toMatch(/not active/);
    expect(validateCoupon({ ...baseCoupon, validUntil: new Date("2020-01-01") }, 1500)).toMatch(/expired/);
    expect(validateCoupon({ ...baseCoupon, validFrom: new Date("2030-01-01") }, 1500)).toMatch(/not yet valid/);
  });
  it("enforces min order value and usage limit", () => {
    expect(validateCoupon(baseCoupon, 500)).toMatch(/Minimum order/);
    expect(validateCoupon({ ...baseCoupon, usedCount: 100 }, 1500)).toMatch(/limit/);
  });
});

describe("couponDiscount", () => {
  it("applies percentage with max cap", () => {
    // 10% of 1500 = 150, under cap
    expect(couponDiscount(1500, baseCoupon)).toBe(150);
    // 10% of 10000 = 1000, capped at 500
    expect(couponDiscount(10000, baseCoupon)).toBe(500);
  });
  it("applies fixed discount, never exceeding subtotal", () => {
    const fixed: CouponLike = { ...baseCoupon, discountType: "FIXED", discountValue: 200, maxDiscount: null, minOrderValue: null };
    expect(couponDiscount(1500, fixed)).toBe(200);
    expect(couponDiscount(100, { ...fixed, minOrderValue: null })).toBe(100);
  });
  it("returns 0 for invalid coupon", () => {
    expect(couponDiscount(1500, { ...baseCoupon, isActive: false })).toBe(0);
  });
});

describe("shippingFeeFor", () => {
  it("is free above threshold", () => {
    expect(shippingFeeFor(FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(shippingFeeFor(5000)).toBe(0);
  });
  it("charges flat fee below threshold", () => {
    expect(shippingFeeFor(498)).toBe(FLAT_SHIPPING_FEE);
    expect(shippingFeeFor(100)).toBe(FLAT_SHIPPING_FEE);
  });
  it("is zero for empty cart", () => {
    expect(shippingFeeFor(0)).toBe(0);
  });
});

describe("calcTotals", () => {
  it("sums lines and applies coupon + shipping", () => {
    const t = calcTotals(
      [
        { unitPrice: 799, quantity: 2 },
        { unitPrice: 499, quantity: 1 },
      ],
      baseCoupon
    );
    // subtotal 2097, 10% = 209.7 → 210 capped ok, after = 1887 ≥ 499 → free shipping
    expect(t.subtotal).toBe(2097);
    expect(t.discount).toBe(210);
    expect(t.shippingFee).toBe(0);
    expect(t.total).toBe(1887);
    expect(t.itemCount).toBe(3);
  });
  it("adds shipping for small orders", () => {
    const t = calcTotals([{ unitPrice: 199, quantity: 1 }]);
    expect(t.shippingFee).toBe(FLAT_SHIPPING_FEE);
    expect(t.total).toBe(199 + FLAT_SHIPPING_FEE);
  });
  it("never goes negative", () => {
    const t = calcTotals([], baseCoupon);
    expect(t.total).toBe(0);
  });
});

describe("formatINR", () => {
  it("formats rupees", () => {
    expect(formatINR(1500)).toMatch(/1,500/);
  });
});
