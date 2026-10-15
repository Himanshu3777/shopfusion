export const metadata = { title: "About · ShopFusion" };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-fusion-700 dark:text-fusion-300">Our story</p>
      <h1 className="font-display mt-2 text-3xl font-extrabold">About ShopFusion</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        ShopFusion started with a simple idea: one marketplace where discovery feels effortless,
        sellers are treated fairly, and every order arrives with confidence. We fuse a wide
        catalogue — electronics, fashion, home, beauty and grocery — with honest pricing and
        human support.
      </p>

      <Block title="What we stand for">
        <p><strong className="text-slate-900 dark:text-white">Verified sellers.</strong> Every seller store on ShopFusion is reviewed before it can list products, so you always know who you&apos;re buying from.</p>
        <p><strong className="text-slate-900 dark:text-white">Honest prices.</strong> Discounts are shown against the real selling price — no inflated &quot;was&quot; prices, no fine-print surprises at checkout.</p>
        <p><strong className="text-slate-900 dark:text-white">Easy returns.</strong> Changed your mind? Most items can be returned within 7 days, no questions asked.</p>
      </Block>

      <Block title="How it works">
        <p>Browse the catalogue, filter by what matters to you, and check out in a couple of taps. Orders are split per seller so each store ships and tracks its own items, and you can follow every package from confirmation to your doorstep.</p>
        <p>Sellers get a straightforward dashboard: list products with variants, manage inventory, and fulfil orders without fighting an algorithm.</p>
      </Block>

      <Block title="Get in touch">
        <p>Questions, feedback or partnership ideas? Head to our <a href="/contact" className="font-medium text-fusion-700 hover:underline dark:text-fusion-300">contact page</a> — a real human replies within one business day.</p>
      </Block>
    </div>
  );
}
