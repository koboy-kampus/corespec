import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { auditLabel } from "@/lib/admin/audit";
import { isStaleCheck, readAdminCatalogue } from "@/lib/admin/catalogue-data";
import { requireAdmin } from "@/lib/auth/dal";
import { getCatalogue } from "@/lib/catalogue/load";
import { isCheckoutConfigured } from "@/lib/checkout/config";
import { countNeedsVerification } from "@/lib/checkout/read";
import { formatShortDate } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { unreadCount } from "@/lib/chat/inbox";
import { supabaseAdminChat } from "@/lib/chat/store";
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

/**
 * Only when the checkout simulation is configured (Phase 17a). The text says
 * how many paid orders wait for an admin's verification (Phase 20a).
 */
function ordersLink(needsVerification: number | null) {
  return {
    href: "/admin/orders",
    title: "Orders",
    text:
      needsVerification === null
        ? "Every payment simulation; verify the paid ones."
        : needsVerification
          ? `${needsVerification} paid order${needsVerification === 1 ? "" : "s"} need${needsVerification === 1 ? "s" : ""} verification.`
          : "Every paid order is verified.",
  };
}

/** Live chat (Phase 18): the text says how many conversations are unread. */
function chatLink(unread: number | null) {
  return {
    href: "/admin/chat",
    title: "Chat",
    text:
      unread === null
        ? "Users' questions and the bot's answers."
        : unread
          ? `${unread} conversation${unread === 1 ? "" : "s"} with unread messages.`
          : "No unread messages.",
  };
}

async function Overview() {
  const { supabase } = await requireAdmin();
  const checkout = isCheckoutConfigured();
  const [{ data }, catalogue, audit, source, chat, toVerify] =
    await Promise.all([
      supabase.rpc("admin_stats"),
      readAdminCatalogue(supabase),
      supabase
        .from("audit_log")
        .select("id, at, action, table_name, row_id, diff")
        .order("id", { ascending: false })
        .limit(12),
      getCatalogue(),
      supabaseAdminChat(supabase)
        .inbox()
        .then(unreadCount)
        .catch(() => null),
      checkout ? countNeedsVerification(supabase) : null,
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
        {[
          ...LINKS,
          ...(checkout ? [ordersLink(toVerify ?? null)] : []),
          chatLink(chat),
        ].map((l) => (
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
            {audit.data.map((e) => {
              const l = auditLabel(e);
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-[14px] leading-5"
                >
                  <Badge
                    variant={e.action === "order.verify" ? "ok" : "neutral"}
                  >
                    {l.kind}
                  </Badge>
                  <span className="text-fg">
                    {l.verb} <span className="spec text-[13px]">{l.row}</span>
                  </span>
                  {l.detail ? (
                    <span className="text-fg-3">{l.detail}</span>
                  ) : null}
                  <span className="ml-auto text-[13px] text-fg-3">
                    {formatShortDate(e.at)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-[14px] leading-5 text-fg-3">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
