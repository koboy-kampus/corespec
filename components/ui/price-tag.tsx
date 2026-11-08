import * as React from "react";
import { cn } from "cn";
import { formatIDR, formatIDRCompact } from "@/lib/format";

interface PriceTagProps extends React.ComponentProps<"span"> {
  /** Integer rupiah. */
  value: number;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "default" | "muted";
  /** Use short units: "Rp 15,4 jt". */
  compact?: boolean;
  /** Optional micro label shown above, e.g. "Total". */
  label?: string;
}

const sizeClass = {
  sm: "text-spec-sm",
  md: "text-[14px] leading-[18px] font-medium",
  lg: "text-[24px] leading-[28px] font-medium tracking-[-0.5px]",
} as const;

const toneClass = {
  accent: "text-accent",
  default: "text-fg",
  muted: "text-fg-3",
} as const;

function PriceTag({
  value,
  size = "md",
  tone = "accent",
  compact = false,
  label,
  className,
  ...props
}: PriceTagProps) {
  const text = compact ? formatIDRCompact(value) : formatIDR(value);
  const price = (
    <span
      data-slot="price-tag"
      className={cn(
        "spec whitespace-nowrap",
        sizeClass[size],
        toneClass[tone],
        !label && className,
      )}
      {...(label ? {} : props)}
    >
      {text}
    </span>
  );
  if (!label) return price;
  return (
    <span className={cn("inline-flex flex-col gap-1", className)} {...props}>
      <span className="label-micro text-fg-3">{label}</span>
      {price}
    </span>
  );
}

export { PriceTag };
