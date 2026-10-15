import Link from "next/link";
import { Logo } from "./Logo";

// Static year constant: keeps footer deterministic for static prerendering.
// Bump once a year.
const YEAR = 2026;

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/products" },
      { label: "Deals", href: "/deals" },
      { label: "Categories", href: "/products" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "My orders", href: "/orders" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  {
    title: "Sell with us",
    links: [
      { label: "Become a seller", href: "/seller/register" },
      { label: "Seller dashboard", href: "/seller" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "About us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Shipping policy", href: "/shipping" },
      { label: "Returns & refunds", href: "/returns" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-slate-500">An original marketplace experience — discover, shop and sell with confidence.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.href + l.label}><Link href={l.href} className="text-slate-600 hover:text-fusion-600 dark:text-slate-300">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
        © {YEAR} ShopFusion. All rights reserved.
      </div>
    </footer>
  );
}
