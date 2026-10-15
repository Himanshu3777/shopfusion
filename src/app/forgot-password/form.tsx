"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // The API always responds with the same message (no email enumeration),
      // so a successful request means the link was sent if the account exists.
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-12">
      <Card className="w-full p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a link to reset it</p>
          </div>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              If an account exists for that email address, a password reset link has been sent.
            </p>
            <p className="text-sm text-slate-500">
              Back to{" "}
              <Link href="/login" className="font-medium text-fusion-600 hover:text-fusion-700">
                sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Send reset link
            </Button>
            <p className="text-center text-sm text-slate-500">
              Remembered it?{" "}
              <Link href="/login" className="font-medium text-fusion-600 hover:text-fusion-700">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
