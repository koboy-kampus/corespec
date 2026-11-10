"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import type { CompatResult, SetupResult, Severity } from "@/lib/compat/check";
import { getItem } from "@/lib/parts";
import { useUiStore } from "@/store/ui";

const GROUPS: {
  severity: Severity;
  title: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    severity: "error",
    title: "Incompatible",
    icon: XCircle,
    tone: "text-accent",
  },
  {
    severity: "warning",
    title: "Warnings",
    icon: AlertTriangle,
    tone: "text-warn",
  },
  { severity: "info", title: "To do", icon: Info, tone: "text-fg-3" },
];

/** Results of one kind (PC or setup), grouped by severity. */
function ResultGroups({
  results,
  readOnly,
  infoTitle,
}: {
  results: CompatResult[];
  readOnly: boolean;
  infoTitle: string;
}) {
  const openPicker = useUiStore((s) => s.openPicker);
  return GROUPS.map(({ severity, title, icon: Icon, tone }) => {
    const items = results.filter((r) => r.severity === severity);
    if (!items.length) return null;
    return (
      <div key={severity} className="flex flex-col gap-1.5">
        <p
          className={cn(
            "inline-flex items-center gap-1.5 label-micro text-micro-sm",
            tone,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {severity === "info" ? infoTitle : title} · {items.length}
        </p>
        <ul className="flex flex-col gap-1.5">
          {items.map((r) => {
            // Errors and warnings: offer to swap the first part involved.
            const target =
              !readOnly && r.severity !== "info"
                ? getItem(r.partIds[0])
                : undefined;
            const body = (
              <>
                <Icon
                  className={cn("mt-0.5 size-3.5 shrink-0", tone)}
                  aria-hidden
                />
                <span className="flex-1">{r.message}</span>
                {target ? (
                  <ArrowRight
                    className="mt-0.5 size-3.5 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                ) : null}
              </>
            );
            const cls = cn(
              "group flex w-full items-start gap-2 rounded-input border px-3 py-2 text-left text-[13px] leading-5 text-fg-2",
              r.severity === "error" && "border-accent/30 bg-accent-soft",
              r.severity === "warning" && "border-warn/30 bg-warn/5",
              r.severity === "info" && "border-line bg-surface",
            );
            return (
              <li key={r.id}>
                {target ? (
                  <button
                    type="button"
                    className={cn(cls, "cursor-pointer hover:text-fg")}
                    onClick={() => openPicker(target.category)}
                    aria-label={`${r.message} Change ${target.name}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  });
}

/**
 * Compatibility results grouped by severity, then the setup rules under their own
 * Setup heading (warnings and notes only: they never make a build incompatible).
 * In the builder, clicking an issue opens the picker for the item to change;
 * `readOnly` (shared builds) shows plain rows.
 */
export function CompatPanel({
  results,
  setupResults = [],
  readOnly = false,
}: {
  results: CompatResult[];
  setupResults?: SetupResult[];
  readOnly?: boolean;
}) {
  const setup = setupResults.length ? (
    <section
      aria-labelledby="setup-checks-title"
      className="flex flex-col gap-3"
    >
      <h3 id="setup-checks-title" className="label-micro text-fg-2">
        Setup checks
      </h3>
      <ResultGroups
        results={setupResults}
        readOnly={readOnly}
        infoTitle="Notes"
      />
    </section>
  ) : null;

  if (results.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-btn border border-ok/30 bg-ok/5 p-3.5">
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-ok"
            aria-hidden
          />
          <div>
            <p className="text-ui font-medium text-fg">All checks passed</p>
            <p className="text-[13px] leading-5 text-fg-2">
              Every part fits and works together.
            </p>
          </div>
        </div>
        {setup}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="compat-title" className="flex flex-col gap-3">
        <h3 id="compat-title" className="label-micro text-fg-2">
          Compatibility
        </h3>
        <ResultGroups results={results} readOnly={readOnly} infoTitle="To do" />
      </section>
      {setup}
    </div>
  );
}
