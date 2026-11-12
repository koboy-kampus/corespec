import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard } from "@/components/account/auth-card";
import { ForgotPasswordForm } from "@/components/account/auth-forms";
import { authEmailEnabled, isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false },
};

/** Only when the project can send email (NEXT_PUBLIC_AUTH_EMAIL=on). */
export default function Page() {
  if (!isSupabaseConfigured() || !authEmailEnabled()) notFound();
  return (
    <AuthCard
      title="Forgot your password?"
      lead="Enter your email and we'll send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
