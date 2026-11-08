import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Builds" };

export default function Page() {
  return (
    <ComingSoon
      title="Builds"
      description="Your saved builds will live here, with rename, duplicate and share links."
      tag="Coming soon · Phase 6"
    />
  );
}
