import { AlertTriangle, Check, XCircle, Zap } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { formatWatts } from "@/lib/format";
import { POWER, recommendedPsuW } from "@/lib/power";

/** Estimated draw vs PSU capacity, with the 1.3× headroom target marked. */
export function WattageMeter({
  drawW,
  psuW,
}: {
  drawW: number;
  psuW?: number;
}) {
  const target = recommendedPsuW(drawW);
  const scale = Math.max(psuW ?? 0, target) * 1.08;
  const pct = (w: number) => `${Math.min(100, (w / scale) * 100)}%`;
  const status = !psuW
    ? "none"
    : psuW < drawW
      ? "error"
      : psuW < drawW * POWER.headroom
        ? "warning"
        : "ok";

  return (
    <section aria-labelledby="power-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="power-title" className="label-micro text-fg-2">
          Power
        </h3>
        {status === "ok" ? (
          <Badge variant="ok" icon={<Check />}>
            Headroom OK
          </Badge>
        ) : status === "warning" ? (
          <Badge variant="warn" icon={<AlertTriangle />}>
            Low headroom
          </Badge>
        ) : status === "error" ? (
          <Badge variant="error" icon={<XCircle />}>
            PSU too small
          </Badge>
        ) : (
          <Badge variant="outline">No PSU yet</Badge>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="label-micro text-micro-sm text-fg-3">Est. draw</span>
          <span className="inline-flex items-center gap-1.5 spec text-[20px] leading-6 font-medium text-fg">
            <Zap className="size-4 text-accent" aria-hidden />
            {formatWatts(drawW)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="label-micro text-micro-sm text-fg-3">
            {psuW ? "PSU" : "Recommended"}
          </span>
          <span className="spec text-[14px] leading-5 text-fg-2">
            {psuW ? formatWatts(psuW) : `≥ ${formatWatts(target)}`}
          </span>
        </div>
      </div>

      <div
        className="relative h-2.5 rounded-full bg-surface-2"
        role="meter"
        aria-label="Estimated draw against PSU capacity"
        aria-valuemin={0}
        aria-valuemax={psuW ?? target}
        aria-valuenow={drawW}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            status === "warning"
              ? "bg-warn"
              : status === "none"
                ? "bg-fg-3/50"
                : "bg-gradient-to-r from-accent-strong to-accent",
          )}
          style={{ width: pct(drawW) }}
        />
        <span
          aria-hidden
          className="absolute -inset-y-1 w-px bg-fg"
          style={{ left: pct(target) }}
          title="1.3× headroom target"
        />
        {psuW ? (
          <span
            aria-hidden
            className="absolute -inset-y-1 w-0.5 rounded-full bg-ok"
            style={{ left: pct(psuW) }}
          />
        ) : null}
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 spec text-spec-sm text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-px bg-fg" aria-hidden /> 1.3× target{" "}
          {formatWatts(target)}
        </span>
        {psuW ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-0.5 rounded-full bg-ok" aria-hidden /> PSU{" "}
            {formatWatts(psuW)}
          </span>
        ) : null}
      </p>
      <p className="text-[12px] leading-4 text-fg-3">
        PC parts only: the monitor, speakers and other setup items plug into the
        wall, not the PSU.
      </p>
    </section>
  );
}
