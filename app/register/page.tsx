import type { Metadata } from "next";
import { AccountsNotSetUp, AuthCard } from "@/components/account/auth-card";
import { RegisterForm } from "@/components/account/auth-forms";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a CoreSpec account to keep your builds on every device.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthCard
      title="Create an account"
      lead={
        isSupabaseConfigured()
          ? "Optional: the builder works without one. An account keeps your builds on every device."
          : undefined
      }
    >
      {isSupabaseConfigured() ? <RegisterForm /> : <AccountsNotSetUp />}
    </AuthCard>
  );
}
