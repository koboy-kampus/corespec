import { ChevronDown } from "lucide-react";
import { ShopLinks } from "@/components/ui/shop-links";
import { CATEGORY_LABEL } from "@/lib/categories";
import { partLabel } from "@/lib/parts";
import type { Item } from "@/types/parts";

/**
 * The chosen items with links to buy them: checked listings, or a marketplace
 * search when an item has none. Folded by default so it doesn't crowd the summary.
 */
export function WhereToBuy({ items }: { items: Item[] }) {
  if (!items.length) return null;
  return (
    <details className="group flex flex-col gap-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-input label-micro text-fg-3 hover:text-fg [&::-webkit-details-marker]:hidden">
        Where to buy ({items.length})
        <ChevronDown
          className="size-3.5 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <p className="text-[12px] leading-4 text-fg">
              <span className="text-fg-3">
                {CATEGORY_LABEL[item.category]} ·{" "}
              </span>
              {partLabel(item)}
            </p>
            <ShopLinks item={item} />
          </li>
        ))}
      </ul>
    </details>
  );
}
