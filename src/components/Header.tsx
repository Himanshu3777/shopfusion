"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

type Me = { id: string; name: string | null; email: string; role: string } | null;

async function fetchMe(): Promise<Me> {
  try {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j.ok ? j.data.user : null;
  } catch {
    return null;
  }
}

export function Header() {
  const [me, setMe] = useState<Me>(null);
  const [q, setQ] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [dark, setDark] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchMe().then(setMe);
    fetch("/api/cart", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.ok && setCartCount(j.data?.summary?.itemCount ?? 0))
      .catch(() => {});
    // Defer the DOM read so the initial render matches the server (no hydration mismatch).
    queueMicrotask(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("sf-theme", next ? "dark" : "light"); } catch {}
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" aria-label="ShopFusion home"><Logo /></Link>

        <form onSubmit={submitSearch} className="hidden flex-1 md:block" role="search">
          <div className="flex overflow-hidden rounded-full border border-slate-300 focus-within:border-fusion-500 dark:border-slate-700">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search for products, brands and more…"
              aria-label="Search products"
              className="w-full bg-transparent px-4 py-2 text-sm outline-none"
            />
            <button type="submit" aria-label="Search" className="bg-fusion-600 px-5 text-sm font-medium text-white hover:bg-fusion-700">Search</button>
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1 text-sm" aria-label="Account">
          <Link href="/products" className="hidden rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:block">Shop</Link>
          <Link href="/deals" className="hidden rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:block">Deals</Link>
          <button onClick={toggleDark} aria-label="Toggle dark mode" className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            {dark ? "☀" : "◐"}
          </button>
          <Link href="/wishlist" aria-label="Wishlist" className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">♡</Link>
          <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            🛒
            {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-glow-500 px-1.5 text-[11px] font-bold text-white">{cartCount}</span>}
          </Link>
          {me ? (
            <Link href={me.role === "ADMIN" ? "/admin" : me.role === "SELLER" ? "/seller" : "/dashboard"} className="rounded-lg px-3 py-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
              {me.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-fusion-600 px-4 py-2 font-medium text-white hover:bg-fusion-700">Login</Link>
          )}
        </nav>
      </div>
      <form onSubmit={submitSearch} className="px-4 pb-3 md:hidden" role="search">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className={cn("w-full rounded-full border border-slate-300 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900")}
        />
      </form>
    </header>
  );
}
