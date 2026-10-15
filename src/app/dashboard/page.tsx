import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard");
  const name = session.user.name ?? session.user.email ?? "there";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
        Hello, {name}
      </h1>
      <p className="mb-6 text-sm text-slate-500">Here&apos;s what&apos;s happening with your ShopFusion account.</p>
      <DashboardClient />
    </div>
  );
}
