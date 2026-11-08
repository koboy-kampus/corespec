import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = {
  title: "About",
  description:
    "What CoreSpec is, how prices and compatibility checks work, and who made it.",
};

export default function Page() {
  return (
    <ComingSoon
      title="About"
      description="CoreSpec is a 3D PC builder for Indonesian buyers. Spec it, see it, build it. More about the project is on the way."
      tag="Coming soon"
    />
  );
}
