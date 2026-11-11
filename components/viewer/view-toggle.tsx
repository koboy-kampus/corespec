"use client";

import { Cpu, Monitor } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/** PC | Desk switch for the 3D viewport (Phase 12). Two toggle buttons, one pressed. */
export function ViewToggle({
  view,
  onChange,
  className,
}: {
  view: "pc" | "desk";
  onChange: (view: "pc" | "desk") => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="3D view"
      className={cn(
        "flex rounded-btn border border-line bg-surface-2/70 p-0.5 backdrop-blur",
        className,
      )}
    >
      {(
        [
          ["pc", "PC", <Cpu key="pc" />],
          ["desk", "Desk", <Monitor key="desk" />],
        ] as const
      ).map(([value, label, icon]) => (
        <Button
          key={value}
          variant={view === value ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={view === value}
          icon={icon}
          onClick={() => onChange(value)}
          className={cn("h-7 px-2.5", view !== value && "text-fg-3")}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
