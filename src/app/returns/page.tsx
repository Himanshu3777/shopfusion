export const metadata = { title: "Returns & Refunds · ShopFusion" };

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Returns & Refunds</h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">7-day easy returns</h2>
          <p className="mt-2">Changed your mind? You can return most items within <strong className="text-slate-900 dark:text-white">7 days of delivery</strong> for a full refund — no questions asked. Items should be unused, with tags and original packaging intact.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">How to start a return</h2>
          <p className="mt-2">Go to your orders, pick the item and choose &quot;Return&quot;. We&apos;ll arrange a doorstep pickup where available, or share a prepaid shipping label. Once the seller receives and checks the item, your refund is processed.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Refund timelines</h2>
          <p className="mt-2">Refunds go back to your original payment method: UPI and wallets within 24–48 hours, cards within 5–7 business days. Cash-on-delivery orders are refunded to your bank account or as ShopFusion credit — your choice.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Non-returnable items</h2>
          <p className="mt-2">For hygiene and safety, personal care, innerwear, perishable grocery and opened software can&apos;t be returned unless they arrived damaged or incorrect. Damaged or wrong items are always eligible — just raise it within 7 days with a photo.</p>
        </section>
      </div>
    </div>
  );
}
