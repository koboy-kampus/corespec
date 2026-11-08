import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const cardVariants = cva("relative border border-line text-fg-2 shadow-edge", {
  variants: {
    variant: {
      solid: "rounded-card bg-surface",
      glass: "glass rounded-card",
      bento: "overflow-hidden rounded-tile bg-surface",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
    /** Lift 2px and brighten the border on hover (for clickable cards). */
    interactive: {
      true: "group/card transition-[transform,border-color,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-line-hover",
      false: "",
    },
  },
  defaultVariants: { variant: "solid", padding: "md", interactive: false },
});

type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants>;

function Card({
  className,
  variant,
  padding,
  interactive,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-h3 text-fg", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-body text-fg-2", className)} {...props} />;
}

export { Card, CardTitle, CardDescription, cardVariants };
