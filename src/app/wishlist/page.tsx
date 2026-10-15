import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WishlistClient from "./WishlistClient";

export const metadata = { title: "Your Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Your Wishlist</h1>
      <WishlistClient />
    </div>
  );
}
