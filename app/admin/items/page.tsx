import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { ItemFilters } from "@/components/admin/item-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { isStaleCheck, readAdminCatalogue } from "@/lib/admin/catalogue-data";
import { requireAdmin } from "@/lib/auth/dal";
import { CATEGORY_LABEL, ALL_CATEGORIES } from "@/lib/categories";
import { formatIDR } from "@/lib/format";
import { TIER_LABEL } from "@/lib/picker";
import { newestCheck, shownPrice } from "@/lib/prices";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Catalogue · Admin",
  robots: { index: false },
};

export default function Page({ searchParams }: PageProps<"/admin/items">) {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Items searchParams={searchParams} />
    </Suspense>
  );
}

const param = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

async function Items({
  searchParams,
}: Pick<PageProps<"/admin/items">, "searchParams">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filters = {
    q: param(sp.q).trim(),
    category: param(sp.category),
    tier: param(sp.tier),
    status: param(sp.status),
    unchecked: param(sp.unchecked) === "1",
  };
  const { items, error } = await readAdminCatalogue(supabase);
  const order = new Map(ALL_CATEGORIES.map((c, i) => [c, i]));
  const q = filters.q.toLowerCase();
  const shown = items
    .filter(
      (i) =>
        (!q || `${i.brand} ${i.name} ${i.id}`.toLowerCase().includes(q)) &&
        (!filters.category || i.category === filters.category) &&
        (!filters.tier || i.tier === filters.tier) &&
        (filters.status !== "active" || i.active !== false) &&
        (filters.status !== "inactive" || i.active === false) &&
        (!filters.unchecked || !i.listings?.length),
    )
    .sort((a, b) => order.get(a.category)! - order.get(b.category)!);
  const now = new Date();

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Admin
      </Link>
      <SectionHeader
        as="h1"
        eyebrow="Admin"
        title="Catalogue"
        subtitle="Every item, active or not, with its estimate and the listings checked by hand. Saving updates the site within seconds."
        layout="split"
      />
      {error ? (
        <p role="alert" className="text-body text-fg-2">
          Couldn&apos;t load the catalogue. Reload to try again.
        </p>
      ) : !items.length ? (
        <p className="rounded-card border border-line bg-surface p-5 text-body text-fg-2">
          The catalogue isn&apos;t in the database yet, so the site shows the
          JSON in <code className="spec">data/</code>. Run{" "}
          <code className="spec">supabase/seed.sql</code> in the Supabase SQL
          editor (see docs/accounts.md).
        </p>
      ) : (
        <>
          <ItemFilters value={filters} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] leading-5 text-fg-2" role="status">
              {shown.length} of {items.length} items
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/items/new">
                <Plus aria-hidden /> Add item
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[760px] text-left text-[14px] leading-5">
              <caption className="sr-only">Catalogue items</caption>
              <thead className="border-b border-line bg-surface label-micro text-fg-3">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Item
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Tier
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Estimate
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Shown
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Listings
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((i) => {
                  const newest = newestCheck([i]);
                  return (
                    <tr key={i.id} className="align-middle text-fg-2">
                      <th scope="row" className="px-4 py-3 font-medium">
                        <Link
                          href={`/admin/items/${encodeURIComponent(i.id)}`}
                          className="text-fg underline-offset-2 hover:underline"
                        >
                          {i.brand} {i.name}
                        </Link>
                        <span className="block truncate spec text-[12px] leading-4 font-normal text-fg-3">
                          {i.id}
                        </span>
                      </th>
                      <td className="px-4 py-3">
                        {CATEGORY_LABEL[i.category]}
                      </td>
                      <td className="px-4 py-3">{TIER_LABEL[i.tier]}</td>
                      <td className="px-4 py-3 text-right spec whitespace-nowrap">
                        {formatIDR(i.priceIDR)}
                      </td>
                      <td className="px-4 py-3 text-right spec whitespace-nowrap">
                        {formatIDR(shownPrice(i))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {i.listings?.length ? (
                          <span className="flex items-center gap-2">
                            {i.listings.length} · {newest}
                            {newest && isStaleCheck(newest, now) ? (
                              <Badge variant="warn">Old</Badge>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-fg-3">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {i.active === false ? (
                          <Badge variant="outline">Out of picker</Badge>
                        ) : (
                          <Badge variant="ok">Active</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
