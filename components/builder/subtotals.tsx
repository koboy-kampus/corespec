import { formatIDR } from "@/lib/format";

/** PC subtotal and setup subtotal under the total. The Total itself sits above. */
export function Subtotals({
  pcIDR,
  setupIDR,
}: {
  pcIDR: number;
  setupIDR: number;
}) {
  const row = "flex items-baseline justify-between gap-3";
  return (
    <dl
      className="flex flex-col gap-1 spec text-spec-sm"
      aria-label="Subtotals"
    >
      <div className={row}>
        <dt className="text-fg-3">PC subtotal</dt>
        <dd className="text-fg-2">{formatIDR(pcIDR)}</dd>
      </div>
      <div className={row}>
        <dt className="text-fg-3">Setup subtotal</dt>
        <dd className="text-fg-2">{formatIDR(setupIDR)}</dd>
      </div>
    </dl>
  );
}
