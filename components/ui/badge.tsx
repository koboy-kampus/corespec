import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "label-micro inline-flex w-fit shrink-0 items-center gap-1.5 border px-2 py-1 whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-2 text-fg-2",
        accent: "border-accent/30 bg-accent-soft text-accent",
        ok: "border-ok/30 bg-ok/10 text-ok",
        warn: "border-warn/30 bg-warn/10 text-warn",
        // Brand colour is red, so "error" must always carry an icon + words.
        error: "border-accent/40 bg-accent-soft text-accent",
        outline: "border-line-strong bg-transparent text-fg-3",
      },
      shape: {
        chip: "rounded-chip",
        pill: "rounded-full px-2.5",
      },
    },
    defaultVariants: { variant: "neutral", shape: "chip" },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { icon?: React.ReactNode };

function Badge({
  className,
  variant,
  shape,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, shape }), className)}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
