"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Input,
  Badge,
  Loading,
  ErrorState,
  Spinner,
  Price,
  Modal,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/pricing";

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type CartItem = {
  id: string;
  quantity: number;
  savedForLater: boolean;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    price: number | string;
    discountPrice?: number | string | null;
    images: { url: string; alt?: string | null }[];
    seller?: { storeName: string } | null;
  };
  variant: { id: string; name: string } | null;
};

type CartData = {
  items: CartItem[];
  summary: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    tax: number;
    total: number;
    itemCount: number;
  };
  coupon: { code: string | null; discount: number; message: string | null };
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok)
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json.data as T;
}

const emptyAddress = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

const STEPS = ["Address", "Summary", "Payment"];

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  const [cart, setCart] = useState<CartData | null>(null);
  const [couponInput, setCouponInput] = useState(searchParams.get("coupon") ?? "");
  const [applying, setApplying] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "MOCK" | "RAZORPAY">("COD");
  const razorpayAvailable = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const initialCoupon = searchParams.get("coupon");
      const [addrData, cartData] = await Promise.all([
        api<{ items: Address[] }>("/api/addresses"),
        api<CartData>(initialCoupon ? `/api/cart?coupon=${encodeURIComponent(initialCoupon)}` : "/api/cart"),
      ]);
      setAddresses(addrData.items);
      const def = addrData.items.find((a) => a.isDefault) ?? addrData.items[0];
      setSelectedAddressId(def?.id ?? null);
      setCart(cartData);
      if (cartData.items.filter((i) => !i.savedForLater).length === 0) {
        setError("Your cart is empty. Add items before checking out.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load checkout");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  const activeItems = useMemo(
    () => cart?.items.filter((i) => !i.savedForLater) ?? [],
    [cart]
  );

  const refreshCart = async (coupon: string | null) => {
    const d = await api<CartData>(coupon ? `/api/cart?coupon=${encodeURIComponent(coupon)}` : "/api/cart");
    setCart(d);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplying(true);
    try {
      const d = await api<CartData>(`/api/cart?coupon=${encodeURIComponent(code)}`);
      setCart(d);
      if (d.coupon.discount > 0) push(`Coupon ${d.coupon.code} applied`, "success");
      else push(d.coupon.message ?? "Coupon not applicable", "error");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to apply coupon", "error");
    } finally {
      setApplying(false);
    }
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    try {
      const created = await api<Address>("/api/addresses", {
        method: "POST",
        body: JSON.stringify({ ...form, isDefault: addresses.length === 0 ? true : form.isDefault }),
      });
      const d = await api<{ items: Address[] }>("/api/addresses");
      setAddresses(d.items);
      setSelectedAddressId(created.id);
      setShowForm(false);
      setForm(emptyAddress);
      push("Address saved", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to save address", "error");
    } finally {
      setSavingAddress(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const payWithRazorpay = async (rz: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  }, orderIds: string[]) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      push("Could not load payment gateway. Your order is saved — pay from My Orders.", "error");
      router.push("/orders");
      return;
    }
    const RazorpayCtor = (window as unknown as { Razorpay: new (o: object) => { open(): void } }).Razorpay;
    const rzp = new RazorpayCtor({
      key: rz.keyId,
      amount: rz.amount,
      currency: rz.currency,
      name: "ShopFusion",
      description: "Order payment",
      order_id: rz.orderId,
      theme: { color: "#7c3aed" },
      modal: {
        ondismiss: () => {
          push("Payment window closed. Your order is saved — complete payment from My Orders.", "info");
          router.push("/orders");
        },
      },
      handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        try {
          const v = await api<{ orders: { id: string; orderNumber: string; total: number; paymentProvider: string }[] }>(
            "/api/checkout/verify",
            {
              method: "POST",
              body: JSON.stringify({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                orderIds,
              }),
            }
          );
          router.push(`/checkout/success?orders=${encodeURIComponent(JSON.stringify(v.orders))}`);
        } catch (e) {
          push(e instanceof Error ? e.message : "Payment verification failed", "error");
          router.push("/orders");
        }
      },
    });
    rzp.open();
  };

  const placeOrder = async () => {
    if (!selectedAddressId) {
      push("Select a delivery address", "error");
      setStep(1);
      return;
    }
    setPlacing(true);
    try {
      const result = await api<{
        orders: { id: string; orderNumber: string; total: number; paymentProvider: string }[];
        razorpay: { keyId: string; orderId: string; amount: number; currency: string } | null;
      }>(
        "/api/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            addressId: selectedAddressId,
            couponCode: cart?.coupon.code ?? null,
            paymentProvider: paymentMethod,
          }),
        }
      );
      if (result.razorpay) {
        // Online payment: open Razorpay (UPI / cards). Orders stay PENDING until verified.
        setPlacing(false);
        await payWithRazorpay(result.razorpay, result.orders.map((o) => o.id));
        return;
      }
      router.push(`/checkout/success?orders=${encodeURIComponent(JSON.stringify(result.orders))}`);
    } catch (e) {
      push(e instanceof Error ? e.message : "Checkout failed", "error");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Loading label="Preparing checkout…" />;
  if (error && !cart) return <ErrorState title="Couldn't start checkout" hint={error} onRetry={loadAll} />;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-emerald-600 text-white"
                    : current
                      ? "bg-fusion-600 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`text-sm font-medium ${current ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
                {label}
              </span>
              {n < STEPS.length && <span className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl bg-fusion-50 p-4 dark:bg-fusion-950">
            <p className="text-sm font-medium text-fusion-800 dark:text-fusion-200">
              🏠 Home Delivery — select where your order should be delivered
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((a) => (
              <Card
                key={a.id}
                className={`cursor-pointer p-4 ${selectedAddressId === a.id ? "ring-2 ring-fusion-600" : ""}`}
                onClick={() => setSelectedAddressId(a.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {a.fullName} <Badge tone="neutral">{a.label}</Badge>
                      {a.isDefault && <Badge tone="brand" className="ml-1">Default</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}
                    </p>
                    <p className="text-sm text-slate-500">{a.phone}</p>
                  </div>
                  <input
                    type="radio"
                    checked={selectedAddressId === a.id}
                    onChange={() => setSelectedAddressId(a.id)}
                    aria-label={`Deliver to ${a.fullName}`}
                  />
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setShowForm(true)}>+ Add new address</Button>
          <div className="flex justify-end">
            <Button disabled={!selectedAddressId} onClick={() => setStep(2)}>
              Continue to summary
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {activeItems.map((item) => (
              <Card key={item.id} className="flex items-center gap-3 p-3">
                {item.product.images[0] && (
                  <img src={item.product.images[0].url} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.product.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.variant ? `${item.variant.name} · ` : ""}Qty {item.quantity}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatINR(item.lineTotal)}</div>
              </Card>
            ))}
          </div>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-semibold">Coupon</h3>
              {cart?.coupon.discount ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950">
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                    {cart.coupon.code} — {formatINR(cart.coupon.discount)} off
                  </span>
                  <button
                    className="text-xs font-medium text-slate-500 hover:underline"
                    onClick={() => {
                      setCouponInput("");
                      refreshCart(null).catch((e) => push(e.message, "error"));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    aria-label="Coupon code"
                  />
                  <Button onClick={applyCoupon} disabled={applying || !couponInput.trim()}>
                    {applying ? <Spinner size="sm" /> : "Apply"}
                  </Button>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{formatINR(cart?.summary.subtotal ?? 0)}</dd></div>
                {(cart?.summary.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd>−{formatINR(cart!.summary.discount)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd className="font-medium">{formatINR(cart?.summary.shippingFee ?? 0)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-700"><dt>Total</dt><dd>{formatINR(cart?.summary.total ?? 0)}</dd></div>
              </dl>
            </Card>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue to payment</Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Deliver to</h3>
              {selectedAddress ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selectedAddress.fullName}, {selectedAddress.line1}, {selectedAddress.city},{" "}
                  {selectedAddress.state} {selectedAddress.postalCode} · {selectedAddress.phone}
                </p>
              ) : (
                <p className="text-sm text-red-600">No address selected</p>
              )}
              <button className="mt-1 text-xs font-medium text-fusion-600 hover:underline" onClick={() => setStep(1)}>
                Change
              </button>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Payment method</h3>
              <div className="space-y-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    paymentMethod === "COD"
                      ? "border-fusion-600 bg-fusion-50 dark:bg-fusion-950"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="mt-1"
                    aria-label="Cash on Delivery"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                      💵 Cash on Delivery
                      <Badge tone="success">Recommended</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Pay in cash when your order arrives at your doorstep. No online payment needed.
                    </p>
                  </div>
                </label>
                {razorpayAvailable && (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      paymentMethod === "RAZORPAY"
                        ? "border-fusion-600 bg-fusion-50 dark:bg-fusion-950"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "RAZORPAY"}
                      onChange={() => setPaymentMethod("RAZORPAY")}
                      className="mt-1"
                      aria-label="Pay online with UPI"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        📱 UPI / Online <Badge tone="brand">GPay · PhonePe · Paytm</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Pay securely with UPI, cards or netbanking. Your money is protected.
                      </p>
                    </div>
                  </label>
                )}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    paymentMethod === "MOCK"
                      ? "border-fusion-600 bg-fusion-50 dark:bg-fusion-950"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "MOCK"}
                    onChange={() => setPaymentMethod("MOCK")}
                    className="mt-1"
                    aria-label="Test online payment"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                      🧪 Test payment <Badge tone="brand">MOCK</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Simulates an approved online payment — <strong>no real money will be charged</strong>.
                    </p>
                  </div>
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {activeItems.length} item(s) will be split into one order per seller. Home delivery to your selected address.
              </p>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex justify-between text-base font-bold">
                <span>Payable</span>
                <span>{formatINR(cart?.summary.total ?? 0)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Prices and stock are revalidated securely when you place the order.
              </p>
            </Card>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={placeOrder} disabled={placing || activeItems.length === 0}>
                {placing ? (
                  <Spinner size="sm" />
                ) : paymentMethod === "COD" ? (
                  `Book now · Pay ${formatINR(cart?.summary.total ?? 0)} on delivery`
                ) : paymentMethod === "RAZORPAY" ? (
                  `Pay ${formatINR(cart?.summary.total ?? 0)} with UPI`
                ) : (
                  `Place order · ${formatINR(cart?.summary.total ?? 0)}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add address" wide>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Input label="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required className="md:col-span-2" />
          <Input label="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="md:col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
          <Input label="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Set as default address
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={saveAddress} disabled={savingAddress}>
            {savingAddress ? <Spinner size="sm" /> : "Save address"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
