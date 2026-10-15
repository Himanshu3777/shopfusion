import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { PageSessionUser } from "../seller/auth";

/** Gate an admin page: signed-in ADMINs only. */
export async function requireAdminPage() {
  const session = await auth();
  const u = session?.user as PageSessionUser | undefined;
  if (!u?.id) redirect("/login");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}
