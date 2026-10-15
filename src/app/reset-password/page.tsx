import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "./form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
