"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { deriveBuild } from "@/lib/derive";
import { useBuildStore } from "@/store/build";

/**
 * Loads the saved build from localStorage after mount (the store uses skipHydration),
 * and reports when it's ready. Until then the builder shows a skeleton, so the
 * server HTML and the first client render always match.
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

/** True when the media query matches; false on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
