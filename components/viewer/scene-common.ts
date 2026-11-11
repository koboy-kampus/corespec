"use client";

import { useCallback, useState } from "react";

/** Shared by the PC scene and the desk scene, so neither has to import the other. */

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Keeps removed items around (marked leaving) until their exit animation ends.
 * Same key = same instance, so an item that moves keeps its spring state.
 */
export function usePresence<T extends { key: string }>(items: T[]) {
  const [prev, setPrev] = useState(items);
  const [leaving, setLeaving] = useState<T[]>([]);
  if (items !== prev) {
    const now = new Set(items.map((i) => i.key));
    const gone = prev.filter((p) => !now.has(p.key));
    const goneKeys = new Set(gone.map((g) => g.key));
    setLeaving((l) => [
      ...l.filter((x) => !now.has(x.key) && !goneKeys.has(x.key)),
      ...gone,
    ]);
    setPrev(items);
  }
  const done = useCallback(
    (key: string) => setLeaving((l) => l.filter((x) => x.key !== key)),
    [],
  );
  return { leaving, done };
}
