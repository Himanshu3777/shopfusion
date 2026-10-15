/**
 * Payment abstraction. Production providers (Stripe/Razorpay) plug in here;
 * dev/test use the safe MOCK provider which never moves real money.
 */

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

// Production gateways intentionally NOT implemented here.
// To add one: implement PaymentGateway using the provider SDK with keys from
// process.env (STRIPE_SECRET_KEY / RAZORPAY_KEY_ID...), never hardcode secrets,
// then register it in `gatewayFor` below.

export function gatewayFor(name: PaymentProviderName): PaymentGateway {
  switch (name) {
    case "MOCK":
      return new MockGateway();
    case "STRIPE":
    case "RAZORPAY":
      throw new Error(
        `${name} gateway is not configured. Provide API keys via environment variables and implement the gateway in src/lib/payments.ts.`
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
