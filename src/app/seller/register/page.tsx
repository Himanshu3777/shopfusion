import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Become a Seller · ShopFusion" };

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export default async function SellerRegisterPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login");

  const seller = await db.seller.findUnique({ where: { userId: user.id } });
  if (seller?.status === "APPROVED") redirect("/seller");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Sell on ShopFusion</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Open your store, list products and reach millions of shoppers across India.
      </p>

      <div className="mt-8">
        {seller ? (
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{seller.storeName}</h2>
              <Badge tone={STATUS_TONE[seller.status] ?? "warning"}>{seller.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {seller.status === "PENDING" &&
                "Your application is under review. Our team usually responds within 24–48 hours. We'll notify you once it's approved."}
              {seller.status === "REJECTED" &&
                "Your application wasn't approved this time. You can contact support for details and re-apply later."}
              {seller.status === "SUSPENDED" &&
                "Your store has been suspended. Contact support to resolve this."}
            </p>
          </Card>
        ) : (
          <RegisterForm />
        )}
      </div>
    </div>
  );
}
