import { ClosingCTA } from "@/components/landing/closing-cta";
import { FeatureBento } from "@/components/landing/feature-bento";
import { Hero } from "@/components/landing/hero";
import { QuickStart } from "@/components/landing/quick-start";

export default function Home() {
  return (
    <>
      <Hero />
      <QuickStart />
      <FeatureBento />
      <ClosingCTA />
    </>
  );
}
