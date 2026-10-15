/**
 * Pure pricing/cart math — no I/O, fully unit-testable.
 * All money values are numbers (rupees). Convert Prisma Decimal -> Number at boundaries.
 */

export const FREE_SHIPPING_THRESHOLD = 499;
export const FLAT_SHIPPING_FEE = 49;

export type CouponLike = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
};

export type CartLineLike = {
  unitPrice: number; // effective price per unit (discount price if present)
  quantity: number;
};

/** Whole-number discount percentage, e.g. 1000 -> 799 = 20 */
export function computeDiscountPct(price: number, discountPrice?: number | null): number {
  if (!discountPrice || discountPrice >= price || price <= 0) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

/** Effective selling price (discount price wins when valid). */
export function effectivePrice(price: number, discountPrice?: number | null): number {
  if (discountPrice != null && discountPrice < price && discountPrice >= 0) return discountPrice;
  return price;
}

export function validateCoupon(
  coupon: CouponLike,
  subtotal: number,
  now = new Date()
): string | null {
  if (!coupon.isActive) return "Coupon is not active";
  if (now < coupon.validFrom) return "Coupon is not yet valid";
  if (coupon.validUntil && now > coupon.validUntil) return "Coupon has expired";
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return "Coupon usage limit reached";
  if (coupon.minOrderValue != null && subtotal < coupon.minOrderValue)
    return `Minimum order value is ${formatINR(coupon.minOrderValue)}`;
  return null;
}

/** Discount amount for a coupon applied to a subtotal. Never exceeds subtotal. */
export function couponDiscount(subtotal: number, coupon: CouponLike): number {
  const err = validateCoupon(coupon, subtotal);
  if (err) return 0;
  let discount =
    coupon.discountType === "PERCENTAGE"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  return Math.min(Math.max(0, Math.round(discount)), subtotal);
}

export function shippingFeeFor(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

export type Totals = {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  itemCount: number;
};

/** Server-side totals. Client totals are never trusted. */
export function calcTotals(lines: CartLineLike[], coupon?: CouponLike | null): Totals {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = coupon ? couponDiscount(subtotal, coupon) : 0;
  const afterDiscount = subtotal - discount;
  const shippingFee = shippingFeeFor(afterDiscount);
  const tax = 0; // inclusive pricing for now; field reserved
  const total = Math.max(0, afterDiscount + shippingFee + tax);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  return { subtotal, discount, shippingFee, tax, total, itemCount };
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
