import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type PageSessionUser = { id: string; role?: string; email?: string | null };

/**
 * Gate a seller-area page: requires an APPROVED seller profile.
 * PENDING/REJECTED sellers are sent to the registration page; admins pass through.
 */
export async function requireSellerPage() {
  const session = await auth();
  const u = session?.user as PageSessionUser | undefined;
  if (!u?.id) redirect("/login");

  if (u.role === "ADMIN") return { user: u, seller: null };

  const seller = await db.seller.findUnique({ where: { userId: u.id } });
  if (!seller) redirect("/seller/register");
  if (seller.status !== "APPROVED") redirect("/seller/register");
  return { user: u, seller };
}
