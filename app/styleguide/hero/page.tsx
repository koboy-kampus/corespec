import type { Metadata } from "next";
import { Viewer } from "@/components/viewer/viewer";
import { loadCatalogue } from "@/lib/catalogue/load";
import { getShowcase } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Hero scene",
  robots: { index: false },
};

/**
 * Internal: the landing hero's live 3D scene on its own, the size the hero shows
 * it, for `npm run hero:poster` (with reduced motion it holds the first-frame
 * pose) and for the test that checks the poster still matches the scene.
 */
export default async function Page() {
  await loadCatalogue();
  return (
    <div className="flex justify-center px-4 py-24">
      <div
        data-testid="hero-scene"
        className="relative aspect-square w-full max-w-[520px]"
      >
        <Viewer
          mode="showcase"
          parts={getShowcase().parts}
          skipIntro
          fallback={null}
        />
      </div>
    </div>
  );
}
