"use client";

import { useSyncExternalStore } from "react";
import { cn } from "cn";
import { formatCheckedDate, isStale, priceSource } from "@/lib/prices";
import type { Item } from "@/types/parts";

const noSubscribe = () => () => {};
/** Today, read in the browser only: pages are static, so the server can't know it. */
const today = () => new Date().toDateString();
const noToday = () => null;

/**
 * Where an item's shown price comes from: "Checked 12 Nov" (a marketplace listing
 * Rei checked) or "Estimate". A check older than 14 days adds "Price may have
 * changed", worked out in the viewer's browser so a static page never goes stale.
 */
export function PriceSource({
  item,
  className,
}: {
  item: Item;
  className?: string;
}) {
  const now = useSyncExternalStore(noSubscribe, today, noToday);
  const source = priceSource(item);
  const date = now ? new Date(now) : null;
  const stale =
    source.kind === "checked" && date ? isStale(source.checkedAt, date) : false;
  return (
    <span
      className={cn(
        "inline-flex flex-col items-end gap-0.5 label-micro text-micro-sm",
        className,
      )}
    >
      <span className={source.kind === "checked" ? "text-ok" : "text-fg-3"}>
        {source.kind === "checked"
          ? `Checked ${formatCheckedDate(source.checkedAt, date?.getFullYear())}`
          : "Estimate"}
      </span>
      {stale ? (
        <span className="text-warn normal-case">Price may have changed</span>
      ) : null}
    </span>
  );
}
