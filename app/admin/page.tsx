import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { isStaleCheck, readAdminCatalogue } from "@/lib/admin/catalogue-data";
import { requireAdmin } from "@/lib/auth/dal";
import { getCatalogue } from "@/lib/catalogue/load";
import { formatShortDate } from "@/lib/format";
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

const LINKS = [
  {
    href: "/admin/items",
    title: "Catalogue",
    text: "Items, estimates and checked listings.",
  },
  {
    href: "/admin/users",
    title: "Users",
    text: "Everyone with an account, and who is an admin.",
  },
  {
    href: "/admin/settings",
    title: "Settings",
    text: "“Estimates as of” and other site values.",
  },
] as const;

const ACTION_LABEL = { insert: "Added", update: "Changed", delete: "Deleted" };
const TABLE_LABEL: Record<string, string> = {
  items: "Item",
  listings: "Listing",
  site_settings: "Setting",
  profiles: "Role",
};

async function Overview() {
  const { supabase } = await requireAdmin();
  const [{ data }, catalogue, audit, source] = await Promise.all([
    supabase.rpc("admin_stats"),
    readAdminCatalogue(supabase),
    supabase
      .from("audit_log")
      .select("id, at, action, table_name, row_id, diff")
      .order("id", { ascending: false })
      .limit(12),
    getCatalogue(),
  ]);
  const s = data?.[0];
  const now = new Date();
  const staleListings = catalogue.listings.filter((l) =>
    isStaleCheck(String(l.checked_at).slice(0, 10), now),
  ).length;
  const tiles = [
    { label: "Accounts", value: s?.user_count },
    { label: "Admins", value: s?.admin_count },
    { label: "Builds in accounts", value: s?.build_count },
    { label: "Accounts with builds", value: s?.users_with_builds },
    { label: "New accounts, last 7 days", value: s?.new_users_7d },
    { label: "Items", value: catalogue.items.length },
    {
      label: "Out of the picker",
      value: catalogue.items.filter((i) => i.active === false).length,
    },
    { label: "Checked listings", value: catalogue.listings.length },
    { label: "Listings over 14 days old", value: staleListings },
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
      {source.source === "json" ? (
        <p
          role="status"
          className="rounded-input border border-warn/40 bg-warn/10 px-3 py-2 text-[13px] leading-5 text-fg"
        >
          {source.reason === "empty"
            ? "The public site shows the catalogue from the JSON: the database's catalogue is empty. Run supabase/seed.sql."
            : "The public site couldn't read the database's catalogue the last time it tried, so it shows the JSON. It tries again within a minute."}
        </p>
      ) : null}
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
      <div className="grid gap-3 sm:grid-cols-3">
        {LINKS.map((l) => (
          <Card key={l.href} padding="none" interactive>
            <Link
              href={l.href}
              className="flex items-center justify-between gap-3 p-5"
            >
              <span className="flex flex-col gap-1">
                <span className="text-h3 text-fg">{l.title}</span>
                <span className="text-[14px] leading-5 text-fg-2">
                  {l.text}
                </span>
              </span>
              <ArrowRight
                className="size-4 text-fg-3 transition-colors group-hover/card:text-accent"
                aria-hidden
              />
            </Link>
          </Card>
        ))}
      </div>
      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <h2 id="recent" className="text-h3 text-fg">
          Recent changes
        </h2>
        {audit.data?.length ? (
          <ol className="divide-y divide-line rounded-card border border-line">
            {audit.data.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-[14px] leading-5"
              >
                <Badge variant="neutral">
                  {TABLE_LABEL[e.table_name] ?? e.table_name}
                </Badge>
                <span className="text-fg">
                  {ACTION_LABEL[e.action]}{" "}
                  <span className="spec text-[13px]">{e.row_id}</span>
                </span>
                {e.action === "update" ? (
                  <span className="text-fg-3">
                    {Object.keys(e.diff).join(", ")}
                  </span>
                ) : null}
                <span className="ml-auto text-[13px] text-fg-3">
                  {formatShortDate(e.at)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[14px] leading-5 text-fg-3">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
