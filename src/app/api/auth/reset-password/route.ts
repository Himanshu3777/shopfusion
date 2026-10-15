import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, withErrorHandling, ApiError } from "@/lib/api";
import { passwordSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

/**
 * POST /api/auth/reset-password
 * Consumes a single-use, unexpired reset token: sets the new password and
 * marks the token as used so it cannot be replayed.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { token, password } = schema.parse(await req.json());

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, "This reset link is invalid or has expired. Please request a new one.");
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return ok({ message: "Your password has been updated. You can now sign in." });
});
