import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { formatIDR } from "@/lib/format";
import { OUTBOUND_REL, shopLinks } from "@/lib/prices";
import type { Item } from "@/types/parts";

/**
 * Links out to marketplaces: "View on Shopee" for each listing Rei checked, or
 * "Search on Tokopedia / Shopee" (their own search pages) when there's none.
 * Text names only, no logos; always a new tab and `nofollow`.
 */
export function ShopLinks({
  item,
  className,
}: {
  item: Item;
  className?: string;
}) {
  const links = shopLinks(item);
  return (
    <ul
      className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}
      aria-label={`Where to buy the ${item.brand} ${item.name}`}
    >
      {links.map((l) => (
        <li key={l.url}>
          <a
            href={l.url}
            target="_blank"
            rel={OUTBOUND_REL}
            data-kind={l.kind}
            className="inline-flex items-center gap-1 text-[12px] leading-4 text-fg-2 underline-offset-2 hover:text-fg hover:underline"
          >
            {l.label}
            {l.priceIDR != null ? (
              <span className="spec text-spec-sm text-fg-3">
                {formatIDR(l.priceIDR)}
              </span>
            ) : null}
            <ExternalLink className="size-3 shrink-0" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
