import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormMessage } from "@/components/account/field";
import { ItemDelete } from "@/components/admin/item-delete";
import { ItemForm } from "@/components/admin/item-form";
import {
  ListingForm,
  ListingRow,
  type ListingView,
} from "@/components/admin/listing-forms";
import { SectionHeader } from "@/components/ui/section-header";
import {
  finishChoices,
  itemFormValues,
  MODEL_IDS,
} from "@/lib/admin/catalogue-form";
import { isStaleCheck, readAdminCatalogue } from "@/lib/admin/catalogue-data";
import { deleteBlock, isSeedItem, presetsUsing } from "@/lib/admin/item-delete";
import { requireAdmin } from "@/lib/auth/dal";
import { MAX_PRICE_GAP, todayJakarta } from "@/lib/catalogue/listings";
import { formatIDR } from "@/lib/format";
import { presets } from "@/lib/presets";
import { shownPrice } from "@/lib/prices";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Marketplace } from "@/types/parts";
import { AdminSkeleton } from "../../skeleton";

export const metadata: Metadata = {
  title: "Item · Admin",
  robots: { index: false },
};

export default function Page({
  params,
  searchParams,
}: PageProps<"/admin/items/[id]">) {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <ItemPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ItemPage({
  params,
  searchParams,
}: Pick<PageProps<"/admin/items/[id]">, "params" | "searchParams">) {
  const { supabase } = await requireAdmin();
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const added = (await searchParams).added === "1";
  const { items, listings, error } = await readAdminCatalogue(supabase);
  const item = items.find((i) => i.id === id);
  if (!item && !error) notFound();

  const today = todayJakarta();
  const now = new Date();
  const views: ListingView[] = listings
    .filter((l) => l.item_id === id)
    .sort((a, b) => a.price_idr - b.price_idr)
    .map((l) => ({
      id: l.id,
      marketplace: l.marketplace as Marketplace,
      url: l.url,
      priceIDR: l.price_idr,
      checkedAt: String(l.checked_at).slice(0, 10),
      stale: isStaleCheck(String(l.checked_at).slice(0, 10), now),
    }));
  const presetLocked = presets.some(
    (p) =>
      Object.values(p.parts).includes(id) ||
      Object.values(p.setup ?? {}).includes(id),
  );

  // Delete: only for items not from the repo, in no preset and no saved build.
  const seed = isSeedItem(id);
  const usedByPresets = presetsUsing(id);
  let usage: number | null = null;
  let usageFailed = false;
  if (item && !seed && !usedByPresets.length) {
    const res = await supabase.rpc("item_usage_count", { p_item_id: id });
    if (!res.error && typeof res.data === "number") usage = res.data;
    else usageFailed = true;
  }
  const blocked = usageFailed
    ? "Couldn't check whether saved builds use this item, so it can't be deleted right now. If this keeps happening, run supabase/migrations/20261115000100_item_delete.sql in the SQL editor."
    : (deleteBlock({ seed, presets: usedByPresets, usage })?.message ?? null);

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <Link
        href="/admin/items"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Catalogue
      </Link>
      {error || !item ? (
        <p role="alert" className="text-body text-fg-2">
          Couldn&apos;t load this item. Reload to try again.
        </p>
      ) : (
        <>
          <SectionHeader
            as="h1"
            eyebrow={item.id}
            title={`${item.brand} ${item.name}`}
            subtitle={`Shown at ${formatIDR(shownPrice(item))}: ${item.listings?.length ? "the cheapest checked listing" : "the estimate, since nothing is checked"}.`}
            layout="split"
          />
          {added ? (
            <FormMessage tone="ok">Added to the catalogue.</FormMessage>
          ) : null}

          <section
            aria-labelledby="listings"
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
          >
            <div className="flex flex-col gap-1">
              <h2 id="listings" className="text-h3 text-fg">
                Checked listings
              </h2>
              <p className="text-[14px] leading-5 text-fg-2">
                Real listings you checked by hand: open the link, check the
                price, then save it or mark it checked today. The cheapest one
                is the price CoreSpec shows. A price more than{" "}
                {Math.round(MAX_PRICE_GAP * 100)}% from the estimate asks you to
                confirm it.
              </p>
            </div>
            {views.length ? (
              <ul className="divide-y divide-line rounded-input border border-line bg-canvas/40">
                {views.map((l) => (
                  <ListingRow
                    key={l.id}
                    itemId={id}
                    listing={l}
                    today={today}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-[14px] leading-5 text-fg-3">
                None yet: the site shows the estimate and search links.
              </p>
            )}
            <details className="group rounded-input border border-line p-4">
              <summary className="cursor-pointer text-ui font-medium text-fg">
                Add a listing
              </summary>
              <div className="pt-4">
                <ListingForm itemId={id} today={today} />
              </div>
            </details>
          </section>

          <ItemForm
            mode="edit"
            category={item.category}
            initial={itemFormValues(item)}
            presetLocked={presetLocked}
            modelIds={MODEL_IDS}
            finishMaterials={finishChoices(item)}
          />

          <ItemDelete
            itemId={item.id}
            label={`${item.brand} ${item.name}`}
            listings={views.length}
            blocked={blocked}
          />
        </>
      )}
    </div>
  );
}
