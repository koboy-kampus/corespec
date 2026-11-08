"use client";

import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuildHydration } from "@/hooks/use-build";
import { useBuildStore } from "@/store/build";
import type { Build } from "@/types/parts";

/**
 * Adds the shared build to My builds and opens it in the builder. Waits until the
 * saved builds have loaded from localStorage, so importing can't overwrite them.
 */
export function CopyToBuilds({ name, parts }: Pick<Build, "name" | "parts">) {
  const hydrated = useBuildHydration();
  const importBuild = useBuildStore((s) => s.importBuild);
  const router = useRouter();

  return (
    <Button
      icon={<CopyPlus />}
      disabled={!hydrated}
      onClick={() => {
        importBuild({ name, parts });
        router.push("/builder");
      }}
    >
      Copy to my builds
    </Button>
  );
}
