import type * as React from "react";
import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

const PINS = [8.5, 12, 15.5];

/** Geometric chip mark: a die with pins on all four sides. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 text-accent", className)}
    >
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="9" y="9" width="6" height="6" rx="1.25" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {PINS.map((p) => (
          <g key={p}>
            <path d={`M${p} 1.25V3`} />
            <path d={`M${p} 21V22.75`} />
            <path d={`M1.25 ${p}H3`} />
            <path d={`M21 ${p}H22.75`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

type LogoProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  showBeta?: boolean;
};

/** Props are forwarded to the Link so wrappers like <SheetClose asChild> can attach handlers. */
export function Logo({ showBeta = true, className, ...props }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 rounded-input",
        className,
      )}
      {...props}
    >
      <LogoMark />
      <span className="text-[14px] leading-none font-semibold tracking-[0.14em] text-fg">
        CORESPEC
      </span>
      {showBeta ? (
        <Badge
          variant="accent"
          shape="pill"
          className="px-2 py-0.5 text-micro-sm"
        >
          Beta
        </Badge>
      ) : null}
      {/* The visible text stays part of the name, so voice control can "click CoreSpec". */}
      <span className="sr-only">home</span>
    </Link>
  );
}
