export const metadata = { title: "Privacy Policy · ShopFusion" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-xs text-slate-500">Last updated: October 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">1. What we collect</h2>
          <p className="mt-2">We collect the information you give us directly: your name, email, phone number, delivery addresses, order history, product reviews and wishlist items. We also record basic technical data (device type, pages visited) to keep the site fast and secure.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">2. How we use it</h2>
          <p className="mt-2">Your data powers your orders — processing payments, arranging delivery, showing order status and handling returns. With your permission we may send offers and updates; you can opt out at any time from your account settings.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">3. What we never do</h2>
          <p className="mt-2">We never sell your personal information. Sellers receive only the order details they need to ship your items (name, address, phone). Payment details are processed by our payment partners and never stored on our servers in readable form.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">4. Your control</h2>
          <p className="mt-2">You can view, correct or delete your personal data from your account at any time, and you can request a full export or deletion by writing to support@shopfusion.example. Deleting your account removes your profile data; anonymised order records may be kept for tax and legal compliance.</p>
        </section>
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">5. Cookies</h2>
          <p className="mt-2">We use essential cookies for sign-in, cart and security, and optional analytics cookies to understand how the marketplace is used. You can block non-essential cookies in your browser without breaking core shopping features.</p>
        </section>
      </div>
    </div>
  );
}
