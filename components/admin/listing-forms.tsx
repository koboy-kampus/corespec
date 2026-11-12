"use client";

import { useActionState, useState } from "react";
import { CalendarCheck, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Field, FormMessage } from "@/components/account/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteListing,
  markChecked,
  saveListing,
  type AdminFormState,
} from "@/lib/admin/catalogue-actions";
import { MARKETPLACES } from "@/lib/catalogue/listings";
import { formatIDR } from "@/lib/format";
import { MARKETPLACE_LABEL, OUTBOUND_REL } from "@/lib/prices";
import type { Marketplace } from "@/types/parts";
import { CheckField, SelectField } from "./inputs";

export interface ListingView {
  id: string;
  marketplace: Marketplace;
  url: string;
  priceIDR: number;
  checkedAt: string;
  /** More than 14 days ago. */
  stale: boolean;
}

const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

/** Add a listing, or edit one. Asks before saving a price far from the estimate. */
export function ListingForm({
  itemId,
  listing,
  today,
  onDone,
}: {
  itemId: string;
  listing?: ListingView;
  today: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    async (prev, form) => {
      const next = await saveListing(prev, form);
      if (next.done) onDone?.();
      return next;
    },
    {},
  );
  const v = state.values ?? {};
  const err = state.fields ?? {};
  const initial = (k: string, fallback: string) =>
    state.values ? one(v[k]) : fallback;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="itemId" value={itemId} />
      {listing ? (
        <input type="hidden" name="listingId" value={listing.id} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <SelectField
          label="Marketplace"
          name="marketplace"
          defaultValue={initial(
            "marketplace",
            listing?.marketplace ?? "tokopedia",
          )}
          options={MARKETPLACES.map((m) => ({
            value: m,
            label: MARKETPLACE_LABEL[m],
          }))}
          error={err.marketplace}
        />
        <Field
          label="Link to the listing"
          name="url"
          type="url"
          inputMode="url"
          spellCheck={false}
          required
          defaultValue={initial("url", listing?.url ?? "")}
          hint="https, on that marketplace's own site. Paste it from the browser."
          error={err.url}
        />
        <Field
          label="Price (Rp)"
          name="priceIDR"
          inputMode="numeric"
          required
          defaultValue={initial(
            "priceIDR",
            listing ? String(listing.priceIDR) : "",
          )}
          error={err.priceIDR}
        />
        <Field
          label="Checked on"
          name="checkedAt"
          type="date"
          max={today}
          required
          defaultValue={initial("checkedAt", listing?.checkedAt ?? today)}
          error={err.checkedAt}
        />
      </div>
      {state.confirmGap ? (
        <div className="flex flex-col gap-2 rounded-input border border-warn/40 bg-warn/10 p-3">
          <p role="alert" className="text-[13px] leading-5 text-fg">
            {state.confirmGap}
          </p>
          <CheckField label="The price is right" name="confirmGap" />
        </div>
      ) : null}
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      {state.done ? <FormMessage tone="ok">Saved.</FormMessage> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : listing ? "Save listing" : "Add listing"}
        </Button>
        {listing && onDone ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function MarkCheckedButton({ listing }: { listing: ListingView }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    markChecked,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="listingId" value={listing.id} />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-label={`Mark the ${MARKETPLACE_LABEL[listing.marketplace]} listing checked today`}
      >
        <CalendarCheck aria-hidden />
        {pending ? "Saving…" : "Mark checked today"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-[12px] leading-4 text-accent">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function DeleteButton({ listing }: { listing: ListingView }) {
  const [sure, setSure] = useState(false);
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    deleteListing,
    {},
  );
  const label = MARKETPLACE_LABEL[listing.marketplace];
  if (!sure)
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setSure(true)}
        aria-label={`Delete the ${label} listing`}
      >
        <Trash2 aria-hidden /> Delete
      </Button>
    );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="listingId" value={listing.id} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Deleting…" : `Yes, delete the ${label} listing`}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setSure(false)}
      >
        Keep it
      </Button>
      {state.error ? (
        <p role="alert" className="text-[12px] leading-4 text-accent">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ListingRow({
  itemId,
  listing,
  today,
}: {
  itemId: string;
  listing: ListingView;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const label = MARKETPLACE_LABEL[listing.marketplace];
  return (
    <li className="flex flex-col gap-3 p-4">
      {editing ? (
        <ListingForm
          itemId={itemId}
          listing={listing}
          today={today}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-ui font-medium text-fg">{label}</span>
            <span className="spec text-fg">{formatIDR(listing.priceIDR)}</span>
            <span className="text-[13px] leading-5 text-fg-2">
              checked {listing.checkedAt}
            </span>
            {listing.stale ? (
              <Badge variant="warn">Over 14 days old</Badge>
            ) : null}
          </div>
          <a
            href={listing.url}
            target="_blank"
            rel={OUTBOUND_REL}
            className="flex w-fit max-w-full items-center gap-1.5 text-[13px] leading-5 text-fg-2 underline-offset-2 hover:text-fg hover:underline"
          >
            <span className="truncate">{listing.url}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="sr-only">(opens {label} in a new tab)</span>
          </a>
          <div className="flex flex-wrap items-start gap-2">
            <MarkCheckedButton listing={listing} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label={`Edit the ${label} listing`}
            >
              <Pencil aria-hidden /> Edit
            </Button>
            <DeleteButton listing={listing} />
          </div>
        </>
      )}
    </li>
  );
}
