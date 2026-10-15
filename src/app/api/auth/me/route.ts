import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { passwordSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

/**
 * GET /api/auth/me
 * Returns the signed-in user's public profile plus their seller status (or null).
 */
export const GET = withErrorHandling(async () => {
  const sessionUser = await requireUser();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      ...publicUserSelect,
      sellerProfile: { select: { status: true } },
    },
  });
  if (!user) throw new ApiError(401, "User not found");

  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    sellerStatus: user.sellerProfile?.status ?? null,
  });
});

const patchSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((d) => !d.newPassword || !!d.currentPassword, {
    message: "Current password is required to change your password",
    path: ["currentPassword"],
  });

/**
 * PATCH /api/auth/me
 * Updates the user's name. Changing the password requires the current
 * password to be verified first.
 */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const sessionUser = await requireUser();
  const body = patchSchema.parse(await req.json());

  if (body.name === undefined && body.newPassword === undefined) {
    throw new ApiError(400, "Nothing to update");
  }

  const data: { name?: string; passwordHash?: string } = {};
  if (body.name !== undefined) data.name = body.name;

  if (body.newPassword !== undefined) {
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true },
    });
    const currentOk =
      !!user?.passwordHash && (await verifyPassword(body.currentPassword!, user.passwordHash));
    if (!currentOk) {
      throw new ApiError(400, "Current password is incorrect");
    }
    data.passwordHash = await hashPassword(body.newPassword);
  }

  const user = await db.user.update({
    where: { id: sessionUser.id },
    data,
    select: publicUserSelect,
  });

  return ok({ user });
});
