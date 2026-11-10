"use client";

import { Cpu, Move3d, RotateCcw } from "lucide-react";
import { cn } from "cn";
import { CaseDrawing } from "@/components/landing/case-drawing";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { ExplodeToggle } from "@/components/viewer/explode-toggle";
import { Viewer } from "@/components/viewer/viewer";
import { isPcCategory } from "@/lib/categories";
import { partLabel } from "@/lib/parts";
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

/** Centre viewport: the live 3D build, with the empty state on top when nothing is picked. */
export function Viewport({ className }: { className?: string }) {
  const { resolved, filled, severityByCategory } = useBuildDerived();
  const openPicker = useUiStore((s) => s.openPicker);
  const activeSlot = useUiStore((s) => s.activeSlot);
  const setActiveSlot = useUiStore((s) => s.setActiveSlot);
  const exploded = useUiStore((s) => s.exploded);
  const setExploded = useUiStore((s) => s.setExploded);
  const loadPreset = useBuildStore((s) => s.loadPreset);
  const empty = filled === 0;

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

      <Viewer
        mode="builder"
        parts={resolved}
        flags={severityByCategory}
        // Setup slots get their own desk view in Phase 12; the PC camera ignores them.
        activeSlot={activeSlot && isPcCategory(activeSlot) ? activeSlot : null}
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

      {!empty ? (
        <>
          <p className="pointer-events-none absolute top-3.5 left-3.5 hidden items-center gap-1.5 label-micro text-micro-sm text-fg-3 sm:flex">
            <Move3d className="size-3.5" aria-hidden />
            Drag or arrow keys to rotate · Scroll or +/− to zoom · R resets
          </p>
          <div className="absolute top-3 right-3 flex gap-2">
            <ExplodeToggle exploded={exploded} onChange={setExploded} />
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
          <BuildDescription />
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
