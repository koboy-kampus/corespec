import * as React from "react";
import { cn } from "cn";

interface SectionHeaderProps extends Omit<
  React.ComponentProps<"div">,
  "title"
> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small mono label above the title, e.g. "01 · Presets". */
  eyebrow?: React.ReactNode;
  /** left: stacked. split: title left, subtitle (and action) right on desktop. */
  layout?: "left" | "split";
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}

function SectionHeader({
  title,
  subtitle,
  eyebrow,
  layout = "left",
  action,
  as: Heading = "h2",
  className,
  ...props
}: SectionHeaderProps) {
  const heading = (
    <div className="flex flex-col gap-3">
      {eyebrow ? <p className="label-micro text-accent">{eyebrow}</p> : null}
      <Heading className="text-h2 text-balance text-fg">{title}</Heading>
    </div>
  );

  if (layout === "split") {
    return (
      <div
        className={cn(
          "grid gap-4 md:grid-cols-2 md:items-end md:gap-12",
          className,
        )}
        {...props}
      >
        {heading}
        <div className="flex flex-col gap-4 md:items-end md:text-right">
          {subtitle ? (
            <p className="max-w-md text-body text-fg-2">{subtitle}</p>
          ) : null}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", className)} {...props}>
      {heading}
      {subtitle ? <p className="text-body text-fg-2">{subtitle}</p> : null}
      {action}
    </div>
  );
}

export { SectionHeader };
export type { SectionHeaderProps };
