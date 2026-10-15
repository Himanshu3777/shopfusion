import type { NextRequest } from "next/server";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/**
 * POST /api/auth/register
 * Creates a CUSTOMER user plus an empty cart and wishlist atomically,
 * and returns the public user payload (never the password hash).
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = registerSchema.parse(await req.json());
  const email = body.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await hashPassword(body.password);

  const user = await db.user.create({
    data: {
      name: body.name,
      email,
      passwordHash,
      role: "CUSTOMER",
      cart: { create: {} },
      wishlist: { create: {} },
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return ok({ user }, 201);
});
