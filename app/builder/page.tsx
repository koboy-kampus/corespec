import type { Metadata } from "next";
import { Suspense } from "react";
import { BuilderApp } from "@/components/builder/builder-app";
import { BuilderSkeleton } from "@/components/builder/builder-skeleton";

export const metadata: Metadata = {
  title: "Builder",
  description:
    "Pick parts for your PC, see compatibility checks and the total in Rupiah, live.",
};

export default function BuilderPage() {
  return (
    // BuilderApp reads ?preset= (useSearchParams) and localStorage, so it renders on
    // the client behind a skeleton.
    <Suspense fallback={<BuilderSkeleton />}>
      <BuilderApp />
    </Suspense>
  );
}
