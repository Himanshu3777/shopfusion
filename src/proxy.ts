import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Route protection proxy (Next.js 16 `proxy` convention).
 * - /login, /register, /forgot-password, /reset-password: redirect away when already signed in
 * - /dashboard, /orders, /checkout, /wishlist, /profile, /seller, /admin: require session
 * Role gating (SELLER/ADMIN) happens inside pages & API routes via requireRole().
 */
const PUBLIC_AUTH = ["/login", "/register", "/forgot-password", "/reset-password"];
const PROTECTED_PREFIXES = ["/dashboard", "/orders", "/checkout", "/wishlist", "/profile", "/seller", "/admin"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await auth();

  if (session?.user && PUBLIC_AUTH.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!session?.user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/forgot-password", "/reset-password", "/dashboard/:path*", "/orders/:path*", "/checkout/:path*", "/wishlist/:path*", "/profile/:path*", "/seller/:path*", "/admin/:path*"],
};
