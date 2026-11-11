import { formatDate } from "@/lib/format";
import { ESTIMATES_AS_OF, NEWEST_CHECK } from "@/lib/parts";

/** The footnote under the builder and shared builds: where the prices come from. */
export function PricesNote({ className }: { className?: string }) {
  return (
    <p className={className}>
      Prices marked Estimate are approximate, as of{" "}
      {formatDate(ESTIMATES_AS_OF)}
      {NEWEST_CHECK
        ? `; prices marked Checked were checked by hand on a marketplace (newest ${formatDate(NEWEST_CHECK)})`
        : ""}
      . Check the store before buying.
    </p>
  );
}
