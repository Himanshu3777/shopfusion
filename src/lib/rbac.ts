import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

/** Returns the signed-in user or throws 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u?.id) throw new ApiError(401, "Authentication required");
  return u;
}

/** Requires one of the given roles or throws 403. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError(403, "You do not have permission");
  return user;
}

/** Requires an approved seller profile; returns it. */
export async function requireSeller() {
  const user = await requireUser();
  if (user.role !== "SELLER" && user.role !== "ADMIN") {
    throw new ApiError(403, "Seller account required");
  }
  if (user.role === "ADMIN") return { user, seller: null };
  const seller = await db.seller.findUnique({ where: { userId: user.id } });
  if (!seller) throw new ApiError(403, "Seller profile not found");
  if (seller.status !== "APPROVED") {
    throw new ApiError(403, `Seller account is ${seller.status.toLowerCase()}`);
  }
  return { user, seller };
}
