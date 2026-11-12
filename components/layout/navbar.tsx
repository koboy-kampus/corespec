"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUiStore } from "@/store/ui";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileMenu } from "./mobile-menu";
import { AccountMenu } from "@/components/account/account-menu";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// With accounts on, the account menu joins the bar from 768px; the short
// button label keeps it from scrolling sideways until there's room (1024px).
const ACCOUNTS = isSupabaseConfigured();

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  // Transparent at the top of the page, glass + hairline once scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-[background-color,border-color] duration-200",
        scrolled ? "border-line glass" : "border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />

        <NavLinks className="ml-2 hidden md:block lg:ml-6" />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            aria-keyshortcuts="Control+K"
            className="hidden gap-2 px-2.5 md:inline-flex"
            icon={<Search />}
          >
            {/* Visible on wide screens; still read out (and voice-clickable) when hidden. */}
            <span className="sr-only lg:not-sr-only">Search</span>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>

          <AccountMenu className="hidden md:inline-flex" />

          <Button
            asChild
            size="sm"
            iconRight={
              <ArrowRight className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
            }
          >
            <Link href="/builder">
              <span
                className={cn("sm:hidden", ACCOUNTS && "md:inline lg:hidden")}
              >
                Build
              </span>
              <span
                className={cn(
                  "hidden sm:inline",
                  ACCOUNTS && "md:hidden lg:inline",
                )}
              >
                Start Building
              </span>
            </Link>
          </Button>

          <MobileMenu className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
