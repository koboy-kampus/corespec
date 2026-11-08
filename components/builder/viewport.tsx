"use client";

import { Box, Cpu } from "lucide-react";
import { cn } from "cn";
import { CaseDrawing } from "@/components/landing/case-drawing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBuildDerived } from "@/hooks/use-build";
import { presets } from "@/lib/presets";
import { useBuildStore } from "@/store/build";
import { useUiStore } from "@/store/ui";

/**
 * Centre viewport. Until Phase 5 swaps in the 3D scene, it shows the technical
 * drawing with callouts taken from the current build.
 */
export function Viewport({ className }: { className?: string }) {
  const { resolved, filled } = useBuildDerived();
  const openPicker = useUiStore((s) => s.openPicker);
  const loadPreset = useBuildStore((s) => s.loadPreset);
  const empty = filled === 0;

  return (
    <section
      aria-label="Build preview"
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden rounded-card border border-line bg-surface/40",
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

      <div className="absolute top-3 left-3 flex items-center gap-2">
        <Badge variant="outline" icon={<Box />}>
          3D viewer · Phase 5
        </Badge>
      </div>

      <CaseDrawing
        gpuLengthMm={resolved.gpu?.lengthMm}
        psuWatts={resolved.psu?.watts}
        className={cn(
          "h-full max-h-[min(78%,560px)] w-auto max-w-[92%] transition-opacity duration-300",
          empty && "opacity-25",
        )}
      />

      {empty ? (
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
      ) : null}
    </section>
  );
}
