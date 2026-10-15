export const metadata = { title: "Terms of Service · ShopFusion" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Terms of Service</h1>
      <p className="mt-2 text-xs text-slate-500">Last updated: October 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">1. The marketplace</h2>
          <p className="mt-2">ShopFusion is a marketplace connecting customers with independent sellers. Each order is a purchase from the seller named on the product page; ShopFusion facilitates payment, logistics tracking and customer support.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">2. Your account</h2>
          <p className="mt-2">You must provide accurate information and keep your password confidential. You are responsible for activity under your account. We may suspend accounts involved in fraud, abuse or repeated policy violations.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">3. Pricing and orders</h2>
          <p className="mt-2">Prices are shown in Indian Rupees and include all taxes. An order is confirmed once payment succeeds; if an item becomes unavailable we will cancel the affected line and refund you in full. We may correct obvious pricing errors before dispatch.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">4. Reviews</h2>
          <p className="mt-2">Reviews must reflect your genuine experience and must not contain abusive, unlawful or misleading content. Reviews linked to a delivered order are marked as verified purchases.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">5. Liability</h2>
          <p className="mt-2">To the extent permitted by law, ShopFusion&apos;s liability for any order is limited to the amount paid for that order. Nothing in these terms limits your statutory consumer rights.</p>
        </section>
      </div>
    </div>
  );
}
