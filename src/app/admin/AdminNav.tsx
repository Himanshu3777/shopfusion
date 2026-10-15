"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/categories", label: "Categories" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap",
              active
                ? "border-fusion-600 text-fusion-700 dark:text-fusion-300"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
