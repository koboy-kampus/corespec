import type { Metadata } from "next";
import { BuildsLibrary } from "@/components/builds/builds-library";

export const metadata: Metadata = {
  title: "My builds",
  description: "Your saved PC builds: rename, duplicate, share or delete them.",
};

export default function Page() {
  return <BuildsLibrary />;
}
