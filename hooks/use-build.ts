"use client";

import { useEffect, useMemo, useState } from "react";
import { deriveBuild } from "@/lib/derive";
import { useBuildStore } from "@/store/build";

/**
 * Loads the saved build from localStorage after mount (the store uses skipHydration),
 * and reports when it's ready. Until then the builder shows the empty build, which
 * is also what the server prerenders, so the first client render always matches.
 */
export function useBuildHydration(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useBuildStore.persist.hasHydrated(),
  );
  useEffect(() => {
    const unsubscribe = useBuildStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    if (!useBuildStore.persist.hasHydrated())
      void useBuildStore.persist.rehydrate();
    return unsubscribe;
  }, []);
  return hydrated;
}

/** Everything the builder derives from the current parts, computed once per change. */
export function useBuildDerived() {
  const parts = useBuildStore((s) => s.build.parts);
  return useMemo(() => deriveBuild(parts), [parts]);
}

export { useMediaQuery } from "./use-media-query";
