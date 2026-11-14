import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

/** The narrow centred card the login, register and password pages sit in. */
export function AuthCard({
  eyebrow = "Account",
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="container-page flex flex-1 items-start justify-center py-12 md:py-20">
      <Card padding="lg" className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="label-micro text-accent">{eyebrow}</p>
          <h1 className="text-h2 text-fg">{title}</h1>
          {lead ? (
            <p className="text-[15px] leading-6 text-fg-2">{lead}</p>
          ) : null}
        </header>
        {children}
      </Card>
    </section>
  );
}

/** What /login and /register show when the site has no Supabase settings. */
export function AccountsNotSetUp() {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-6 text-fg-2">
      <p>Accounts aren&apos;t set up on this site.</p>
      <p>
        You don&apos;t need one: the builder works without logging in, and your
        builds save in this browser automatically.{" "}
        <Link
          href="/builder"
          className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
        >
          Start building
        </Link>
      </p>
    </div>
  );
}
