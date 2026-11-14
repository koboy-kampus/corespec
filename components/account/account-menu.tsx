"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, LogIn, LogOut, Shield, UserRound } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import { flushSync } from "@/lib/account/sync-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAccountStore } from "@/store/account";
import { useBuildStore } from "@/store/build";
import { announceAuthChange, useAuthHint } from "./use-auth-hint";

/**
 * Logs this browser out: sends pending build changes first, ends the session,
 * then forgets the account's builds here (guest builds stay). Used by the menu
 * and the account page.
 */
export async function logOutHere() {
  await flushSync();
  await signOut();
  if (!useBuildStore.persist.hasHydrated())
    await useBuildStore.persist.rehydrate();
  useBuildStore.getState().forgetAccount();
  useAccountStore.getState().clear();
  announceAuthChange();
}

/**
 * The phone menu's account links (the navbar has no room for the menu there).
 * Renders nothing when accounts aren't configured.
 */
export function MobileAccountLinks({
  linkClass,
  onNavigate,
}: {
  linkClass: string;
  onNavigate: () => void;
}) {
  if (!isSupabaseConfigured()) return null;
  return <MobileLinks linkClass={linkClass} onNavigate={onNavigate} />;
}

function MobileLinks({
  linkClass,
  onNavigate,
}: {
  linkClass: string;
  onNavigate: () => void;
}) {
  const hint = useAuthHint();
  const router = useRouter();
  if (!hint)
    return (
      <Link href="/login" onClick={onNavigate} className={linkClass}>
        Log in <LogIn className="size-4 text-fg-3" aria-hidden />
      </Link>
    );
  return (
    <>
      <Link href="/account" onClick={onNavigate} className={linkClass}>
        My account <UserRound className="size-4 text-fg-3" aria-hidden />
      </Link>
      {hint === "admin" ? (
        <Link href="/admin" onClick={onNavigate} className={linkClass}>
          Admin <Shield className="size-4 text-fg-3" aria-hidden />
        </Link>
      ) : null}
      <button
        type="button"
        className={cn(linkClass, "w-full cursor-pointer text-left")}
        onClick={async () => {
          onNavigate();
          await logOutHere();
          const path = window.location.pathname;
          if (path.startsWith("/account") || path.startsWith("/admin"))
            router.push("/");
        }}
      >
        Log out <LogOut className="size-4 text-fg-3" aria-hidden />
      </button>
    </>
  );
}

/**
 * The navbar's account control: "Log in" for guests, a menu when logged in.
 * Decided in the browser from the hint cookie, so pages stay static. Renders
 * nothing when accounts aren't configured.
 */
export function AccountMenu({ className }: { className?: string }) {
  if (!isSupabaseConfigured()) return null;
  return <Menu className={className} />;
}

function Menu({ className }: { className?: string }) {
  const hint = useAuthHint();
  const name = useAccountStore((s) => s.name);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!hint) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        icon={<LogIn />}
        className={cn("px-2.5", className)}
      >
        <Link href="/login">
          <span className="sr-only sm:not-sr-only">Log in</span>
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          icon={<UserRound />}
          className={cn("max-w-44 px-2.5", className)}
          aria-label="Account menu"
        >
          <span className="hidden truncate sm:inline">{name ?? "Account"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">
          {name ?? "Logged in"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound /> My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/builds">
            <FolderOpen /> My builds
          </Link>
        </DropdownMenuItem>
        {hint === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={busy}
          onSelect={async () => {
            setBusy(true);
            try {
              await logOutHere();
              const path = window.location.pathname;
              if (path.startsWith("/account") || path.startsWith("/admin"))
                router.push("/");
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
