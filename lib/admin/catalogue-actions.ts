"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { getSession } from "@/lib/auth/dal";
import { CATALOGUE_TAG, loadCatalogue } from "@/lib/catalogue/load";
import {
  checkListing,
  MAX_PRICE_GAP,
  priceGap,
  todayJakarta,
} from "@/lib/catalogue/listings";
import { itemToRow } from "@/lib/catalogue/rows";
import { checkItem } from "@/lib/catalogue/schema";
import { ALL_ITEMS } from "@/lib/parts";
import { presets } from "@/lib/presets";
import { partCode } from "@/lib/share";
import type { Item } from "@/types/parts";
import { formValues, readItemForm, readRupiah } from "./catalogue-form";

/**
 * Catalogue Server Actions for /admin/items and /admin/settings (Phase 16b).
 * Each one re-checks that the caller is an admin (the page proves nothing),
 * checks the input with the same rules the site uses, and writes as the admin,
 * so Row Level Security and the database checks apply again. A save refreshes
 * the cached catalogue (updateTag), so public pages show it without a redeploy.
 */

export interface AdminFormState {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string | string[]>;
  done?: "saved" | "deleted";
  /** The checked price is far from the estimate: tick "the price is right" to save. */
  confirmGap?: string;
}

const NOT_ADMIN = "Only admins can change the catalogue. Log in again.";

async function admin() {
  const session = await getSession();
  return session?.viewer.role === "admin" ? session : null;
}

/** Items a preset uses can't leave the picker: a preset would open half empty. */
function presetItemIds(): Set<string> {
  return new Set(
    presets.flatMap((p) => [
      ...Object.values(p.parts),
      ...Object.values(p.setup ?? {}),
    ]),
  );
}

function dbMessage(message: string, fallback: string): string {
  if (/row-level security|permission denied/i.test(message)) return NOT_ADMIN;
  if (/duplicate key|already exists/i.test(message))
    return "That already exists.";
  if (/violates check constraint/i.test(message))
    return "The database refused a value. Check the fields and try again.";
  return fallback;
}

function saved() {
  updateTag(CATALOGUE_TAG);
  refresh();
}

export async function saveItem(
  _: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const session = await admin();
  if (!session) return { error: NOT_ADMIN };
  const isNew = form.get("mode") === "new";
  const values = formValues(form);
  const { item, errors } = checkItem(readItemForm(form));
  if (!item) return { fields: errors, values };

  if (item.active === false && presetItemIds().has(item.id))
    return {
      fields: {
        active: "A preset uses this item, so it has to stay in the picker.",
      },
      values,
    };

  if (isNew) {
    await loadCatalogue();
    if (ALL_ITEMS.some((i) => i.id === item.id))
      return { fields: { id: "An item with this id already exists." }, values };
    const code = partCode(item.id);
    const clash = ALL_ITEMS.find(
      (i) => i.id !== item.id && partCode(i.id) === code,
    );
    if (clash)
      return {
        fields: {
          id: `This id's share code clashes with ${clash.id}. Change the id a little.`,
        },
        values,
      };
    const { data: last } = await session.supabase
      .from("items")
      .select("position")
      .eq("category", item.category)
      .order("position", { ascending: false })
      .limit(1);
    const row = itemToRow(item as Item, (last?.[0]?.position ?? -1) + 1);
    const { error } = await session.supabase.from("items").insert(row);
    if (error)
      return {
        error: dbMessage(error.message, "Couldn't add the item. Try again."),
        values,
      };
    updateTag(CATALOGUE_TAG);
    redirect(`/admin/items/${encodeURIComponent(item.id)}?added=1`);
  }

  // id and category never change (share links use the id).
  const { position: _p, id, category: _c, ...row } = itemToRow(item as Item, 0);
  void _p;
  void _c;
  const { data, error } = await session.supabase
    .from("items")
    .update(row)
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return {
      error: error
        ? dbMessage(error.message, "Couldn't save the item. Try again.")
        : "That item isn't in the database. Run supabase/seed.sql first.",
      values,
    };
  saved();
  return { done: "saved" };
}

export async function saveListing(
  _: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const session = await admin();
  if (!session) return { error: NOT_ADMIN };
  const values = formValues(form);
  const itemId = String(form.get("itemId") ?? "");
  const listingId = String(form.get("listingId") ?? "");
  const { listing, errors } = checkListing(
    {
      marketplace: form.get("marketplace"),
      url: form.get("url"),
      priceIDR: readRupiah(String(form.get("priceIDR") ?? "")),
      checkedAt: form.get("checkedAt"),
    },
    todayJakarta(),
  );
  if (!listing) return { fields: errors, values };

  const { data: item } = await session.supabase
    .from("items")
    .select("price_idr")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "That item isn't in the database.", values };

  // The 40% check from prices:apply, as a question rather than a rule.
  const gap = priceGap(listing.priceIDR, item.price_idr);
  if (gap > MAX_PRICE_GAP && form.get("confirmGap") !== "on")
    return {
      confirmGap: `This price is ${Math.round(gap * 100)}% ${listing.priceIDR > item.price_idr ? "above" : "below"} the estimate. Wrong model, size or bundle? If it really is right, tick the box and save again.`,
      values,
    };

  const row = {
    marketplace: listing.marketplace,
    url: listing.url,
    price_idr: listing.priceIDR,
    checked_at: listing.checkedAt,
  };
  const { error } = listingId
    ? await session.supabase.from("listings").update(row).eq("id", listingId)
    : await session.supabase
        .from("listings")
        .insert({ item_id: itemId, ...row });
  if (error)
    return {
      error: dbMessage(error.message, "Couldn't save the listing. Try again."),
      values,
    };
  saved();
  return { done: "saved" };
}

/** "Mark checked today": same price, today's date (in Indonesia). */
export async function markChecked(
  _: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const session = await admin();
  if (!session) return { error: NOT_ADMIN };
  const { error } = await session.supabase
    .from("listings")
    .update({ checked_at: todayJakarta() })
    .eq("id", String(form.get("listingId") ?? ""));
  if (error)
    return { error: dbMessage(error.message, "Couldn't save. Try again.") };
  saved();
  return { done: "saved" };
}

export async function deleteListing(
  _: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const session = await admin();
  if (!session) return { error: NOT_ADMIN };
  const { error } = await session.supabase
    .from("listings")
    .delete()
    .eq("id", String(form.get("listingId") ?? ""));
  if (error)
    return {
      error: dbMessage(error.message, "Couldn't delete it. Try again."),
    };
  saved();
  return { done: "deleted" };
}

export async function saveSettings(
  _: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const session = await admin();
  if (!session) return { error: NOT_ADMIN };
  const asOf = String(form.get("estimatesAsOf") ?? "").trim();
  const values = { estimatesAsOf: asOf };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(asOf)))
    return { fields: { estimatesAsOf: "A date, YYYY-MM-DD." }, values };
  if (asOf > todayJakarta())
    return { fields: { estimatesAsOf: "Can't be in the future." }, values };
  const { error } = await session.supabase
    .from("site_settings")
    .upsert({ key: "estimates_as_of", value: asOf });
  if (error)
    return {
      error: dbMessage(error.message, "Couldn't save. Try again."),
      values,
    };
  saved();
  return { done: "saved", values };
}
