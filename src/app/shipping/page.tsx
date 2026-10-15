export const metadata = { title: "Shipping Policy · ShopFusion" };

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Shipping Policy</h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Delivery charges</h2>
          <p className="mt-2">Delivery is <strong className="text-slate-900 dark:text-white">free on orders of ₹499 or more</strong>. A flat fee of ₹49 applies to smaller orders. Charges are calculated per order at checkout — since each seller ships separately, multi-seller checkouts may show separate delivery lines.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Delivery timelines</h2>
          <p className="mt-2">Most orders arrive within 3–7 business days depending on your location and the seller&apos;s dispatch city. The estimated delivery date shown at checkout is specific to each seller&apos;s items. Remote pin codes may take a little longer.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Tracking</h2>
          <p className="mt-2">Every order gets live tracking from confirmation to delivery. You&apos;ll find the full journey — confirmed, packed, shipped, out for delivery — in your orders page, with notifications at each step.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Delays and issues</h2>
          <p className="mt-2">If your package is delayed beyond the estimated date, contact us and we&apos;ll chase the seller on your behalf. Lost or damaged shipments are replaced or refunded — you never pay for a delivery that didn&apos;t arrive in good condition.</p>
        </section>
      </div>
    </div>
  );
}
