"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { useBuildHydration } from "@/hooks/use-build";
import { presets } from "@/lib/presets";
import { isBlank, useBuildStore } from "@/store/build";
import { BuildCard } from "./build-card";

function LibrarySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your builds"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-card border border-line bg-surface"
        />
      ))}
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-btn bg-accent-soft text-accent">
        <FolderOpen className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-h3 text-fg">No saved builds yet</p>
        <p className="max-w-sm text-[14px] leading-5 text-fg-2">
          Builds save automatically as you pick parts. Start from scratch or
          from a preset.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/builder">Start building</Link>
        </Button>
        {presets.map((p) => (
          <Button key={p.id} asChild variant="secondary">
            <Link href={`/builder?preset=${p.id}`}>{p.name}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

/** "My builds": every build saved in this browser, newest first. */
export function BuildsLibrary() {
  const hydrated = useBuildHydration();
  const router = useRouter();
  const current = useBuildStore((s) => s.build);
  const saved = useBuildStore((s) => s.saved);
  const newBuild = useBuildStore((s) => s.newBuild);
  // Logged in (Phase 16): the account's builds sync, guest builds are marked.
  const account = useBuildStore((s) => s.account);

  const builds = useMemo(
    () =>
      [...(isBlank(current) ? [] : [current]), ...saved].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [current, saved],
  );

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <SectionHeader
        as="h1"
        eyebrow={account ? "Saved in your account" : "Saved in this browser"}
        title="My builds"
        subtitle={
          account
            ? "Builds sync to your account. Ones marked “This browser only” stay here until you import them from My account."
            : "Nothing is uploaded. Share a build to send someone a read-only link."
        }
        layout="split"
        action={
          <Button
            icon={<Plus />}
            onClick={() => {
              newBuild();
              router.push("/builder");
            }}
          >
            New build
          </Button>
        }
      />
      {!hydrated ? (
        <LibrarySkeleton />
      ) : builds.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <li key={b.id} className="flex min-w-0">
              <BuildCard
                build={b}
                isOpen={b.id === current.id}
                where={
                  account
                    ? b.owner === account
                      ? "account"
                      : "browser"
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
