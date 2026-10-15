/**
 * Payment abstraction. Production providers (Stripe/Razorpay) plug in here;
 * dev/test use the safe MOCK provider which never moves real money.
 */
import Razorpay from "razorpay";
import crypto from "crypto";

export type PaymentProviderName = "MOCK" | "STRIPE" | "RAZORPAY";

export type PaymentIntent = {
  providerPaymentId: string;
  status: "PAID" | "PENDING" | "FAILED";
  raw: Record<string, unknown>;
};

export interface PaymentGateway {
  readonly name: PaymentProviderName;
  charge(input: {
    orderId: string;
    orderNumber: string;
    amount: number; // rupees
    currency: string;
    customerEmail: string;
  }): Promise<PaymentIntent>;
}

class MockGateway implements PaymentGateway {
  readonly name = "MOCK" as const;
  async charge(input: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
  }): Promise<PaymentIntent> {
    // Safe: no network, no real money. Simulates an approved test payment.
    return {
      providerPaymentId: `mock_${input.orderNumber}_${Date.now()}`,
      status: "PAID",
      raw: { mode: "mock", note: "Test payment — no real charge", amount: input.amount },
    };
  }
}

// ---- Razorpay (UPI / cards / netbanking — GPay, PhonePe, Paytm etc.) ----

export type RazorpayOrderData = {
  id: string;
  amount: number; // paise
  currency: string;
  receipt: string;
};

function razorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
    );
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function razorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayPublicKey(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "";
}

/** Create a Razorpay order (amount in paise). Call server-side only. */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
  notes?: Record<string, string>
): Promise<RazorpayOrderData> {
  const client = razorpayClient();
  const amountPaise = Math.round(amountRupees * 100);
  const order = await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: receipt.slice(0, 40),
    notes,
  });
  return { id: order.id, amount: order.amount as number, currency: order.currency, receipt };
}

/** Verify Razorpay payment signature (HMAC-SHA256). Server-side only. */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));
  } catch {
    return false;
  }
}

// Production gateways: Stripe intentionally NOT implemented (use Razorpay for India).
// To add Stripe: implement PaymentGateway using the provider SDK with keys from
// process.env, never hardcode secrets, then register it in `gatewayFor` below.

export function gatewayFor(name: PaymentProviderName): PaymentGateway {
  switch (name) {
    case "MOCK":
      return new MockGateway();
    case "RAZORPAY":
      // Razorpay uses a two-step flow (create order → client checkout → verify),
      // so it is handled directly in the checkout routes, not via charge().
      throw new Error("Use createRazorpayOrder + verifyRazorpaySignature for Razorpay.");
    case "STRIPE":
      throw new Error(
        "Stripe gateway is not configured. Provide API keys via environment variables and implement the gateway in src/lib/payments.ts."
      );
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}

export function configuredProvider(): PaymentProviderName {
  const raw = (process.env.PAYMENT_PROVIDER ?? "MOCK").toUpperCase();
  if (raw === "STRIPE" || raw === "RAZORPAY" || raw === "MOCK") return raw;
  return "MOCK";
}

/**
 * COD orders are stored with provider "MOCK" + a mode marker in rawResponse
 * (avoids a DB enum migration). Returns true for Cash on Delivery payments.
 */
export function isCODPayment(payment: { rawResponse?: unknown } | null | undefined): boolean {
  if (!payment?.rawResponse || typeof payment.rawResponse !== "object") return false;
  return (payment.rawResponse as Record<string, unknown>).mode === "cod";
}
