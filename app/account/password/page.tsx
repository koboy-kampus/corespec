import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PasswordForm } from "@/components/account/account-settings";
import { AuthCard } from "@/components/account/auth-card";
import { requireSession } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Change password",
  robots: { index: false },
};

/** Also where a password-reset email link ends up (/auth/confirm logs you in first). */
export default function Page() {
  if (!isSupabaseConfigured()) notFound();
  return (
    <AuthCard
      title="Change password"
      lead="Choose a new password for your account."
    >
      <Suspense
        fallback={
          <div className="h-32 animate-pulse rounded-input bg-surface-2" />
        }
      >
        <Gate />
      </Suspense>
    </AuthCard>
  );
}

async function Gate() {
  await requireSession("/account/password");
  return <PasswordForm />;
}
