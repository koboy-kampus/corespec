"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav } from "@/lib/nav";
import { useUiStore } from "@/store/ui";
import { Logo } from "./logo";

/** Below 768px: hamburger → slide-in drawer from the right. */
export function MobileMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open menu"
          className={className}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[86%] max-w-sm gap-0 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>

        <div className="flex h-16 items-center border-b border-line px-6">
          <SheetClose asChild>
            <Logo showBeta={false} />
          </SheetClose>
        </div>

        <nav aria-label="Mobile" className="flex flex-col px-3 py-4">
          {mainNav.map((item) => (
            <SheetClose asChild key={item.label}>
              <Link
                href={item.href ?? "/"}
                className="group flex items-center justify-between rounded-btn px-3 py-3 text-[18px] leading-6 font-medium text-fg transition-colors hover:bg-surface-2"
              >
                {item.label}
                <ArrowUpRight className="size-4 text-fg-3 transition-colors group-hover:text-accent" />
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-line p-6">
          <Button
            variant="secondary"
            icon={<Search />}
            className="justify-start"
            onClick={() => {
              setOpen(false);
              setPaletteOpen(true);
            }}
          >
            Search
          </Button>
          <SheetClose asChild>
            <Button asChild size="lg" iconRight={<ArrowRight />}>
              <Link href="/builder">Start Building</Link>
            </Button>
          </SheetClose>
          <p className="pt-2 label-micro text-fg-3">CoreSpec · Rev 0.1</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
