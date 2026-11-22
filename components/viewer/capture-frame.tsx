"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Takes one PNG of the scene for the PDF receipt (Phase 17b). Mounted next to
 * the models inside one <Suspense>, so it only mounts once every model has
 * loaded. After the first drawn frame it renders once more and reads the
 * canvas in the same tick: the drawing buffer is still intact then, so the
 * canvas doesn't need preserveDrawingBuffer (the builder's canvases are
 * untouched). Reports null if the read fails (a lost or tainted context).
 */
export function CaptureFrame({
  onCapture,
}: {
  onCapture: (png: string | null) => void;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const done = useRef(false);
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => {
      let png: string | null = null;
      try {
        gl.render(scene, camera);
        png = gl.domElement.toDataURL("image/png");
        // An empty canvas reads back as "data:," (e.g. a zero-size box).
        if (!png.startsWith("data:image/png")) png = null;
      } catch {
        png = null;
      }
      onCapture(png);
    });
  });
  return null;
}
