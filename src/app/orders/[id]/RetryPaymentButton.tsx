"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner, useToast } from "@/components/ui";

/**
 * Retry a pending Razorpay online payment from the order detail page.
 * Expects NEXT_PUBLIC_RAZORPAY_KEY_ID to be set.
 */
export default function RetryPaymentButton({
  orderId,
  amount,
}: {
  orderId: string;
  amount: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const loadScript = () =>
    new Promise<boolean>((resolve) => {
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const start = async () => {
    setBusy(true);
    try {
      // Create a fresh Razorpay order for this unpaid order.
      const r = await fetch("/api/orders/retry-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message ?? "Could not start payment");
      const rz = j.data as { keyId: string; orderId: string; amount: number; currency: string };

      if (!(await loadScript())) throw new Error("Could not load payment gateway");
      const RazorpayCtor = (window as unknown as { Razorpay: new (o: object) => { open(): void } }).Razorpay;
      new RazorpayCtor({
        key: rz.keyId,
        amount: rz.amount,
        currency: rz.currency,
        name: "ShopFusion",
        description: "Order payment",
        order_id: rz.orderId,
        theme: { color: "#7c3aed" },
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const v = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
              orderIds: [orderId],
            }),
          });
          const vj = await v.json().catch(() => null);
          if (!v.ok || !vj?.ok) throw new Error(vj?.error?.message ?? "Verification failed");
          push("Payment successful!", "success");
          router.refresh();
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      push(e instanceof Error ? e.message : "Payment failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={start} disabled={busy} className="mt-3 w-full">
      {busy ? <Spinner size="sm" /> : `📱 Pay ${amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : ""} now with UPI`}
    </Button>
  );
}
