"use client";

import { useState } from "react";
import { Cpu, Monitor, Move3d, RotateCcw } from "lucide-react";
import { cn } from "cn";
import { CaseDrawing } from "@/components/landing/case-drawing";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { DeskViewer } from "@/components/viewer/desk-viewer";
import { ExplodeToggle } from "@/components/viewer/explode-toggle";
import { Viewer } from "@/components/viewer/viewer";
import { ViewToggle } from "@/components/viewer/view-toggle";
import {
  CATEGORY_LABEL,
  isPcCategory,
  isSetupCategory,
} from "@/lib/categories";
import { DESK } from "@/lib/desk";
import { partLabel } from "@/lib/parts";
import type { DeskKey } from "@/lib/viewer/desk-layout";
import { useBuildDerived } from "@/hooks/use-build";
import { presets } from "@/lib/presets";
import { useBuildStore } from "@/store/build";
import { useUiStore } from "@/store/ui";

/**
 * The canvas is hidden from screen readers, so this says in words what it shows.
 * The slot list is the full, keyboard-friendly way to change parts.
 */
function BuildDescription() {
  const { resolved, severityByCategory } = useBuildDerived();
  const parts = Object.values(resolved);
  const flagged = parts.filter((p) => severityByCategory[p.category]);
  return (
    <p className="sr-only">
      3D preview showing {parts.length} parts in the case
      {flagged.length
        ? `; highlighted with problems: ${flagged.map((p) => partLabel(p)).join(", ")}.`
        : "."}
    </p>
  );
}

/** The desk view's text twin: what's on and around the desk, and what's flagged. */
function DeskDescription() {
  const { setup, setupSeverity, resolved } = useBuildDerived();
  const items = Object.values(setup);
  const flagged = items.filter((i) => setupSeverity[i.category]);
  const { widthMm, depthMm } = DESK.fallback;
  return (
    <p className="sr-only">
      3D desk preview showing{" "}
      {items.length
        ? items
            .map((i) => `${CATEGORY_LABEL[i.category]}: ${partLabel(i)}`)
            .join(", ")
        : "no setup items"}
      {resolved.case ? `, and the PC in the ${partLabel(resolved.case)}` : ""}.
      {setup.desk
        ? ""
        : ` No desk picked: a ${widthMm / 10} × ${depthMm / 10} cm stand-in desk is shown.`}
      {flagged.length
        ? ` Highlighted with warnings: ${flagged.map((i) => partLabel(i)).join(", ")}.`
        : ""}
    </p>
  );
}

function DeskFallback() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Monitor className="size-6 text-fg-3" aria-hidden />
      <p className="max-w-xs text-[14px] leading-5 text-fg-2">
        The 3D desk view isn&apos;t available in this browser. Your setup is
        listed in the Setup tab.
      </p>
    </div>
  );
}

/** Centre viewport: the live 3D build, with the empty state on top when nothing is picked. */
export function Viewport({ className }: { className?: string }) {
  const { resolved, filled, severityByCategory, setup, setupSeverity } =
    useBuildDerived();
  const view = useUiStore((s) => s.view3d);
  const setView = useUiStore((s) => s.setView3d);
  // The desk scene loads the first time it's shown, then stays mounted (hidden)
  // so switching back and forth doesn't reload it or replay the drops.
  const [deskSeen, setDeskSeen] = useState(view === "desk");
  if (view === "desk" && !deskSeen) setDeskSeen(true);
  const desk = view === "desk";
  const deskFlags: Partial<Record<DeskKey, true>> = Object.fromEntries(
    Object.keys(setupSeverity).map((k) => [k, true]),
  );
  const openPicker = useUiStore((s) => s.openPicker);
  const activeSlot = useUiStore((s) => s.activeSlot);
  const setActiveSlot = useUiStore((s) => s.setActiveSlot);
  const exploded = useUiStore((s) => s.exploded);
  const setExploded = useUiStore((s) => s.setExploded);
  const loadPreset = useBuildStore((s) => s.loadPreset);
  const empty = filled === 0;
  const pcEmpty = empty && !desk;

  return (
    <section
      aria-label="Build preview"
      className={cn(
        "relative isolate overflow-hidden rounded-card border border-line bg-surface/40",
        className,
      )}
    >
      {/* coral glow + blueprint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(254,46,75,0.16),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)] bg-[size:28px_28px]"
      />

      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          desk && "pointer-events-none opacity-0",
        )}
        inert={desk}
        aria-hidden={desk || undefined}
      >
        <Viewer
          mode="builder"
          parts={resolved}
          flags={severityByCategory}
          // Setup slots get their own desk view in Phase 12; the PC camera ignores them.
          activeSlot={
            activeSlot && isPcCategory(activeSlot) ? activeSlot : null
          }
          exploded={exploded}
          onResetView={() => setActiveSlot(null)}
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            empty && "opacity-30",
          )}
          fallback={
            <div className="flex size-full items-center justify-center">
              <CaseDrawing
                gpuLengthMm={resolved.gpu?.lengthMm}
                psuWatts={resolved.psu?.watts}
                className="h-full max-h-[min(78%,560px)] w-auto max-w-[92%]"
              />
            </div>
          }
        />
      </div>

      {deskSeen ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            !desk && "pointer-events-none opacity-0",
          )}
          inert={!desk}
          aria-hidden={!desk || undefined}
          data-testid="desk-view"
        >
          <DeskViewer
            setup={setup}
            pcCase={resolved.case}
            flagged={deskFlags}
            activeSlot={
              activeSlot && isSetupCategory(activeSlot) ? activeSlot : null
            }
            onResetView={() => setActiveSlot(null)}
            className="absolute inset-0"
            fallback={<DeskFallback />}
          />
          {desk ? <DeskDescription /> : null}
        </div>
      ) : null}

      <ViewToggle
        view={view}
        onChange={setView}
        className="absolute top-3 left-3 z-10"
      />

      {!pcEmpty ? (
        <>
          <p className="pointer-events-none absolute bottom-3.5 left-3.5 hidden items-center gap-1.5 label-micro text-micro-sm text-fg-3 sm:flex">
            <Move3d className="size-3.5" aria-hidden />
            Drag or arrow keys to rotate · Scroll or +/− to zoom · R resets
          </p>
          <div className="absolute top-3 right-3 flex gap-2">
            {desk ? null : (
              <ExplodeToggle exploded={exploded} onChange={setExploded} />
            )}
            {activeSlot ? (
              <Tip content="Back to the full view">
                <Button
                  variant="glass"
                  size="icon-sm"
                  aria-label="Reset view"
                  onClick={() => setActiveSlot(null)}
                  icon={<RotateCcw />}
                />
              </Tip>
            ) : null}
          </div>
          {desk ? null : <BuildDescription />}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-btn bg-accent-soft text-accent">
            <Cpu className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-h3 text-fg">Pick a CPU to start</p>
            <p className="max-w-xs text-[14px] leading-5 text-fg-2">
              Or load a preset and swap parts from there.
            </p>
          </div>
          <Button onClick={() => openPicker("cpu")}>Choose a CPU</Button>
          <div className="flex flex-wrap justify-center gap-2">
            {presets.map((p) => (
              <Button
                key={p.id}
                variant="glass"
                size="sm"
                onClick={() => loadPreset(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
