import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AccountBuilds,
  DeleteAccount,
  DisplayNameForm,
  LogOutButton,
} from "@/components/account/account-settings";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireSession } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export default function Page() {
  if (!isSupabaseConfigured()) notFound();
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-10 md:py-14">
      <SectionHeader as="h1" eyebrow="Account" title="My account" />
      <Suspense fallback={<AccountSkeleton />}>
        <AccountDetails />
      </Suspense>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your account"
      className="flex flex-col gap-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-card border border-line bg-surface"
        />
      ))}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-fg">{title}</h2>
        {description ? (
          <p className="text-[14px] leading-5 text-fg-2">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

/** Reads the session (cookies), so it streams in behind Suspense. */
async function AccountDetails() {
  const { viewer } = await requireSession("/account");
  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Profile"
        description={
          <>
            Logged in as <span className="text-fg">{viewer.email}</span>
          </>
        }
      >
        {viewer.role === "admin" ? (
          <Badge variant="accent" className="-mt-1">
            Admin
          </Badge>
        ) : null}
        <DisplayNameForm current={viewer.displayName} />
      </Section>

      <Section
        title="Builds"
        description="Builds you make while logged in are kept in your account and sync to every browser you log in on."
      >
        <AccountBuilds />
      </Section>

      <Section
        title="Password"
        description="Change the password you log in with."
      >
        <Link
          href="/account/password"
          className="w-fit text-[14px] leading-5 text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
        >
          Change password
        </Link>
      </Section>

      <Section
        title="Log out"
        description="Your account's builds are removed from this browser when you log out. They stay in your account."
      >
        <div>
          <LogOutButton />
        </div>
      </Section>

      <Section
        title="Delete account"
        description="Deletes your account and every build in it, for good."
      >
        <div>
          <DeleteAccount />
        </div>
      </Section>
    </div>
  );
}
