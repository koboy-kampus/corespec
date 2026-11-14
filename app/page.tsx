import { loadCatalogue } from "@/lib/catalogue/load";
import { ClosingCTA } from "@/components/landing/closing-cta";
import { FeatureBento } from "@/components/landing/feature-bento";
import { Hero } from "@/components/landing/hero";
import { QuickStart } from "@/components/landing/quick-start";

/** The landing page. The catalogue is loaded first: the hero and tiles show its prices. */
export default async function Home() {
  await loadCatalogue();
  return (
    <>
      <Hero />
      <QuickStart />
      <FeatureBento />
      <ClosingCTA />
    </>
  );
}
