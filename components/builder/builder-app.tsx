"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBuildDerived, useBuildHydration } from "@/hooks/use-build";
import { CATEGORIES } from "@/lib/categories";
import { formatDate, formatIDR } from "@/lib/format";
import { PRICES_AS_OF } from "@/lib/parts";
import { getPreset } from "@/lib/presets";
import { useBuildStore } from "@/store/build";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildSummary } from "./build-summary";
import { PartPicker } from "./part-picker";
import { SlotList } from "./slot-list";
import { Viewport } from "./viewport";

/**
 * /builder?preset=<id> (landing cards, empty library) starts a new build from that
 * preset, keeping the open build in My builds, then cleans the URL.
 *
 * Its own component behind its own Suspense: useSearchParams() can't run while the
 * page is prerendered, and only this part needs to wait for it, not the builder.
 */
function PresetFromUrl({ hydrated }: { hydrated: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const importBuild = useBuildStore((s) => s.importBuild);
  const presetId = params.get("preset");
  // Strict Mode runs effects twice in dev; only start one build per link.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !presetId || handled.current === presetId) return;
    handled.current = presetId;
    const preset = getPreset(presetId);
    if (preset) importBuild({ name: preset.name, parts: preset.parts });
    router.replace("/builder", { scroll: false });
  }, [hydrated, presetId, importBuild, router]);
  return null;
}

function StatusBar() {
  return (
    <div className="border-t border-line">
      <div className="mx-auto flex min-h-10 w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 xl:px-6">
        <p className="label-micro text-micro-sm text-fg-3">
          CoreSpec builder · Rev 0.1
        </p>
        <p className="text-[12px] leading-4 text-fg-3">
          Prices are approximate, as of {formatDate(PRICES_AS_OF)}. Check the
          store before buying.
        </p>
      </div>
    </div>
  );
}

/**
 * One layout for every screen size, switched by CSS only, so the server HTML is the
 * real builder (no skeleton, no layout flip after hydration):
 * - below 1280px: viewport on top, then a bottom sheet with Parts / Summary tabs;
 * - from 1280px: parts | viewport | summary in three columns. The sheet and tab
 *   wrappers become `display: contents` and both panels show.
 */
export function BuilderApp() {
  const hydrated = useBuildHydration();
  const { filled, totalIDR, results, setupResults } = useBuildDerived();
  const issues = [...results, ...setupResults].filter(
    (r) => r.severity !== "info",
  ).length;

  return (
    <div className="flex flex-1 flex-col" aria-busy={!hydrated || undefined}>
      <h1 className="sr-only">PC builder</h1>
      <Suspense fallback={null}>
        <PresetFromUrl hydrated={hydrated} />
      </Suspense>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col xl:grid xl:h-[calc(100dvh-4rem-2.5rem)] xl:min-h-[620px] xl:grid-cols-[340px_1fr_340px] xl:gap-3 xl:px-6 xl:py-4">
        <div className="px-4 pt-3 xl:col-start-2 xl:row-start-1 xl:min-h-0 xl:p-0">
          <Viewport className="h-[42vh] min-h-[280px] xl:h-full xl:min-h-0" />
        </div>

        <div className="relative -mt-6 rounded-t-tile border border-b-0 border-line bg-surface shadow-edge xl:contents">
          <div
            className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong xl:hidden"
            aria-hidden
          />
          <Tabs
            defaultValue="parts"
            className="mx-auto w-full max-w-2xl px-4 pt-4 pb-6 xl:contents"
          >
            <TabsList className="xl:hidden">
              <TabsTrigger value="parts">
                Parts{" "}
                <span className="spec text-spec-sm text-fg-3">
                  {filled}/{CATEGORIES.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="summary">
                Summary
                {issues ? (
                  <span className="rounded-full bg-accent-soft px-1.5 spec text-spec-sm text-accent">
                    {issues}
                  </span>
                ) : (
                  <span className="spec text-spec-sm text-fg-3">
                    {formatIDR(totalIDR)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="parts"
              forceMount
              aria-label="Parts"
              className="pt-2 data-[state=inactive]:hidden xl:col-start-1 xl:row-start-1 xl:min-h-0 xl:overflow-y-auto xl:pt-0 xl:pr-1 xl:data-[state=inactive]:block"
            >
              <SlotList />
            </TabsContent>
            <TabsContent
              value="summary"
              forceMount
              aria-label="Summary"
              className="pt-3 data-[state=inactive]:hidden xl:col-start-3 xl:row-start-1 xl:min-h-0 xl:overflow-y-auto xl:rounded-card xl:border xl:border-line xl:bg-surface xl:p-5 xl:shadow-edge xl:data-[state=inactive]:block"
            >
              <BuildSummary />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <StatusBar />
      <PartPicker />
    </div>
  );
}
