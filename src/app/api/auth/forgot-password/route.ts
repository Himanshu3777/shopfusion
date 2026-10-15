import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, withErrorHandling } from "@/lib/api";
import { emailSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { passwordResetMail } from "@/lib/email";

const schema = z.object({ email: emailSchema });

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const SUCCESS_MESSAGE =
  "If an account exists for that email address, a password reset link has been sent.";

/**
 * POST /api/auth/forgot-password
 * Always responds with the same message so email addresses cannot be enumerated.
 * When the account exists, creates a single-use reset token (1h expiry) and
 * emails the reset link.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email } = schema.parse(await req.json());
  const normalized = email.toLowerCase();

  const user = await db.user.findUnique({ where: { email: normalized } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/reset-password?token=${token}`;
    await passwordResetMail(user.email, resetUrl);
  }

  return ok({ message: SUCCESS_MESSAGE });
});
