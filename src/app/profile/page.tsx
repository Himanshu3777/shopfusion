import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { EditNameForm, ChangePasswordForm } from "./forms";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      sellerProfile: { select: { status: true, storeName: true } },
    },
  });
  if (!user) redirect("/login");

  const sellerStatus = user.sellerProfile?.status ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your account details and password.</p>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Role</dt>
            <dd>
              <Badge tone="brand">{user.role}</Badge>
            </dd>
          </div>
          {sellerStatus && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Seller status</dt>
              <dd>
                <Badge tone={sellerStatus === "APPROVED" ? "success" : sellerStatus === "PENDING" ? "warning" : "danger"}>
                  {sellerStatus}
                  {user.sellerProfile?.storeName ? ` · ${user.sellerProfile.storeName}` : ""}
                </Badge>
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Member since</dt>
            <dd className="font-medium">
              {user.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Display name</h2>
        <p className="mt-1 text-sm text-slate-500">This is how your name appears on orders and reviews.</p>
        <div className="mt-4">
          <EditNameForm initialName={user.name ?? ""} />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-slate-500">You&apos;ll need your current password to set a new one.</p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </Card>
    </div>
  );
}
