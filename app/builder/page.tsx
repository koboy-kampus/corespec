import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Builder" };

export default function Page() {
  return (
    <ComingSoon
      title="Builder"
      description="The 3D builder is under construction. Soon you will pick parts, watch them snap into a case and see compatibility and the total in Rupiah, live."
      tag="Coming soon · Phase 4"
    />
  );
}
