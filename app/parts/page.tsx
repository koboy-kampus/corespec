import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Parts" };

export default function Page() {
  return (
    <ComingSoon
      title="Parts"
      description="A browsable catalogue of CPUs, boards, GPUs and more, with specs and approximate Indonesian prices."
      tag="Coming soon"
    />
  );
}
