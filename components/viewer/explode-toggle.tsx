"use client";

import { Expand, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Toggles the 3D exploded view. A real toggle button, so screen readers hear "pressed". */
export function ExplodeToggle({
  exploded,
  onChange,
  className,
}: {
  exploded: boolean;
  onChange: (exploded: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      variant="glass"
      size="sm"
      aria-pressed={exploded}
      icon={exploded ? <Shrink /> : <Expand />}
      onClick={() => onChange(!exploded)}
      className={className}
    >
      {exploded ? "Assemble" : "Exploded view"}
    </Button>
  );
}
