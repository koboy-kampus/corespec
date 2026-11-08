import * as React from "react";
import { cn } from "cn";

/** Keyboard key hint, e.g. <Kbd>Ctrl</Kbd><Kbd>K</Kbd> */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong/70 bg-surface-2 px-1.5",
        "font-plex text-micro-sm text-fg-3 uppercase shadow-edge",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
