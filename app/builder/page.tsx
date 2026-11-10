import type { Metadata } from "next";
import { BuilderApp } from "@/components/builder/builder-app";

export const metadata: Metadata = {
  title: "Builder",
  description:
    "Pick parts for your PC, see compatibility checks and the total in Rupiah, live.",
};

export default function BuilderPage() {
  return (
    // Prerendered as the empty builder. The saved build (localStorage) and a
    // ?preset= link are applied after it loads in the browser.
    <BuilderApp />
  );
}
