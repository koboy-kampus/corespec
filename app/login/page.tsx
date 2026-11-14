import type { Metadata } from "next";
import { AccountsNotSetUp, AuthCard } from "@/components/account/auth-card";
import { LoginForm } from "@/components/account/auth-forms";
import { authEmailEnabled, isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to keep your CoreSpec builds in your account.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthCard
      title="Log in"
      lead={
        isSupabaseConfigured()
          ? "Your builds in your account, on every device."
          : undefined
      }
    >
      {isSupabaseConfigured() ? (
        <LoginForm forgotPassword={authEmailEnabled()} />
      ) : (
        <AccountsNotSetUp />
      )}
    </AuthCard>
  );
}
