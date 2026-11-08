"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useBuildDerived,
  useBuildHydration,
  useMediaQuery,
} from "@/hooks/use-build";
import { CATEGORIES } from "@/lib/categories";
import { formatDate, formatIDR } from "@/lib/format";
import { PRICES_AS_OF } from "@/lib/parts";
import { getPreset } from "@/lib/presets";
import { useBuildStore } from "@/store/build";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildSummary } from "./build-summary";
import { BuilderSkeleton } from "./builder-skeleton";
import { PartPicker } from "./part-picker";
import { SlotList } from "./slot-list";
import { Viewport } from "./viewport";

/** /builder?preset=<id> (from the landing page) loads that preset once, then cleans the URL. */
function usePresetFromUrl(hydrated: boolean) {
  const params = useSearchParams();
  const router = useRouter();
  const loadPreset = useBuildStore((s) => s.loadPreset);
  const presetId = params.get("preset");

  useEffect(() => {
    if (!hydrated || !presetId) return;
    if (getPreset(presetId)) loadPreset(presetId);
    router.replace("/builder", { scroll: false });
  }, [hydrated, presetId, loadPreset, router]);
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

/** Below 1280px: viewport on top, then a bottom sheet with Parts / Summary tabs. */
function MobileSheet() {
  const { filled, totalIDR, results } = useBuildDerived();
  const issues = results.filter((r) => r.severity !== "info").length;
  return (
    <div className="relative -mt-6 rounded-t-tile border border-b-0 border-line bg-surface shadow-edge">
      <div
        className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong"
        aria-hidden
      />
      <Tabs
        defaultValue="parts"
        className="mx-auto w-full max-w-2xl px-4 pt-4 pb-6"
      >
        <TabsList>
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
        <TabsContent value="parts" className="pt-2">
          <SlotList />
        </TabsContent>
        <TabsContent value="summary" className="pt-3">
          <BuildSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function BuilderApp() {
  const hydrated = useBuildHydration();
  usePresetFromUrl(hydrated);
  const desktop = useMediaQuery("(min-width: 1280px)");

  if (!hydrated) return <BuilderSkeleton />;

  return (
    <div className="flex flex-1 flex-col">
      {desktop ? (
        <div className="mx-auto grid h-[calc(100dvh-4rem-2.5rem)] min-h-[620px] w-full max-w-[1600px] grid-cols-[340px_1fr_340px] gap-3 px-6 py-4">
          <aside className="min-h-0 overflow-y-auto pr-1">
            <SlotList />
          </aside>
          <Viewport />
          <aside className="min-h-0 overflow-y-auto rounded-card border border-line bg-surface p-5 shadow-edge">
            <BuildSummary />
          </aside>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="px-4 pt-3">
            <Viewport className="h-[42vh] min-h-[280px]" />
          </div>
          <MobileSheet />
        </div>
      )}
      <StatusBar />
      <PartPicker />
    </div>
  );
}
