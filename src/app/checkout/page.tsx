import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CheckoutClient from "./CheckoutClient";
import { Loading } from "@/components/ui";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/checkout");
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Checkout</h1>
      <Suspense fallback={<Loading label="Preparing checkout…" />}>
        <CheckoutClient />
      </Suspense>
    </div>
  );
}
