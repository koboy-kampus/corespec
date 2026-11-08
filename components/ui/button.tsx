import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap select-none",
    "border font-medium text-ui transition-[background-color,border-color,box-shadow,filter,color] duration-150 ease-out",
    "disabled:pointer-events-none disabled:cursor-not-allowed aria-disabled:pointer-events-none",
    "disabled:border-line-strong disabled:bg-surface disabled:text-fg-3 disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent-strong font-semibold text-white shadow-primary hover:shadow-primary-hover hover:brightness-105",
        secondary:
          "border-line bg-surface text-fg shadow-edge hover:border-line-hover hover:bg-surface-2",
        glass:
          "glass border-line text-fg shadow-edge hover:border-line-hover hover:bg-surface-2/80",
        ghost:
          "border-transparent bg-transparent text-fg-2 hover:bg-surface-2 hover:text-fg",
      },
      size: {
        sm: "h-8 rounded-input px-3 text-[13px]",
        md: "h-10 rounded-btn px-4",
        lg: "h-12 rounded-btn px-5 text-[15px]",
        "icon-sm": "size-8 rounded-input",
        icon: "size-10 rounded-btn",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next <Link>) with button styles. */
    asChild?: boolean;
    /** Optional leading icon. */
    icon?: React.ReactNode;
    /** Optional trailing icon (e.g. an arrow). */
    iconRight?: React.ReactNode;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  icon,
  iconRight,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const classes = cn(buttonVariants({ variant, size }), className);

  // With asChild, Slot needs exactly one child, so icons are slotted inside it.
  if (
    asChild &&
    React.isValidElement<{ children?: React.ReactNode }>(children)
  ) {
    return (
      <Comp data-slot="button" className={classes} {...props}>
        {React.cloneElement(
          children,
          undefined,
          <>
            {icon}
            {children.props.children}
            {iconRight}
          </>,
        )}
      </Comp>
    );
  }

  return (
    <Comp data-slot="button" className={classes} {...props}>
      {icon}
      {children}
      {iconRight}
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
