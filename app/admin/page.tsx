import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAdmin } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

/**
 * Admin overview. Everything, headings included, is behind the admin check, so
 * anyone else only ever sees a loading shell and then the 404 page.
 */
export default function Page() {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_stats");
  const s = data?.[0];
  const tiles = [
    { label: "Accounts", value: s?.user_count },
    { label: "Admins", value: s?.admin_count },
    { label: "Builds in accounts", value: s?.build_count },
    { label: "Accounts with builds", value: s?.users_with_builds },
    { label: "New accounts, last 7 days", value: s?.new_users_7d },
  ];

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <SectionHeader
        as="h1"
        eyebrow="Admin"
        title="Overview"
        subtitle="Totals only: admins can't see anyone's builds."
        layout="split"
      />
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} padding="sm" className="flex flex-col gap-1">
            <dt className="label-micro text-fg-3">{t.label}</dt>
            <dd className="spec text-[28px] leading-9 text-fg">
              {t.value ?? "–"}
            </dd>
          </Card>
        ))}
      </dl>
      <Card padding="none" interactive className="w-full max-w-sm">
        <Link
          href="/admin/users"
          className="flex items-center justify-between gap-3 p-5"
        >
          <span className="flex flex-col gap-1">
            <span className="text-h3 text-fg">Users</span>
            <span className="text-[14px] leading-5 text-fg-2">
              Everyone with an account, and who is an admin.
            </span>
          </span>
          <ArrowRight
            className="size-4 text-fg-3 transition-colors group-hover/card:text-accent"
            aria-hidden
          />
        </Link>
      </Card>
    </div>
  );
}
