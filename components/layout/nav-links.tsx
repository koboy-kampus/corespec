"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/lib/nav";

const linkClass =
  "relative rounded-input px-2.5 py-1.5 text-ui font-medium text-fg-2 transition-colors duration-150 hover:text-fg aria-[current=page]:text-fg";

function Links({ active }: { active?: string | null }) {
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {mainNav.map((item) => {
        const current = !!active && !!item.href && active.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href ?? "/"}
            aria-current={current ? "page" : undefined}
            className={linkClass}
          >
            {item.label}
            {current ? (
              <span
                aria-hidden
                className="absolute inset-x-2.5 -bottom-[13px] h-px bg-accent"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveLinks() {
  return <Links active={usePathname()} />;
}

/**
 * usePathname can suspend under cacheComponents on dynamic routes,
 * so the active-state version sits behind Suspense with a plain fallback.
 */
export function NavLinks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Suspense fallback={<Links />}>
        <ActiveLinks />
      </Suspense>
    </div>
  );
}
