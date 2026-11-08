import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = {
  title: "Parts",
  description:
    "Browse every part in the CoreSpec catalogue with specs and prices in Rupiah.",
  // Placeholder until the catalogue page exists: kept out of search and the sitemap.
  robots: { index: false },
};

export default function Page() {
  return (
    <ComingSoon
      title="Parts"
      description="A browsable catalogue of CPUs, boards, GPUs and more, with specs and approximate Indonesian prices."
      tag="Coming soon"
    />
  );
}
