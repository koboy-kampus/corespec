"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriceTag } from "@/components/ui/price-tag";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { deriveBuild } from "@/lib/derive";
import { formatShortDate } from "@/lib/format";
import { useBuildStore } from "@/store/build";
import type { Build } from "@/types/parts";
import { BuildStatus } from "./build-status";
import { ShareDialog } from "./share-dialog";

type Modal = "rename" | "share" | "delete" | null;

/** A saved build: summary, "Open in builder" and a menu with rename, duplicate, share and delete. */
export function BuildCard({
  build,
  isOpen,
}: {
  build: Build;
  isOpen: boolean;
}) {
  const router = useRouter();
  const openBuild = useBuildStore((s) => s.openBuild);
  const renameBuild = useBuildStore((s) => s.renameBuild);
  const duplicateBuild = useBuildStore((s) => s.duplicateBuild);
  const deleteBuild = useBuildStore((s) => s.deleteBuild);
  const d = useMemo(() => deriveBuild(build.parts), [build.parts]);
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState(build.name);
  // After a delete the card is gone, so focus falls back to the page content.
  const focus = useReturnFocus(() => document.getElementById("main"));

  const open = () => {
    openBuild(build.id);
    router.push("/builder");
  };

  return (
    <Card padding="none" className="flex min-w-0 flex-col">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-h3 text-fg">{build.name}</h2>
              {isOpen ? (
                <Badge variant="accent" shape="pill" className="shrink-0">
                  Open
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12px] leading-4 text-fg-3">
              Edited {formatShortDate(build.updatedAt)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`More actions for ${build.name}`}
                icon={<MoreHorizontal />}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setDraft(build.name);
                  setModal("rename");
                }}
              >
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => duplicateBuild(build.id)}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={d.filled === 0}
                onSelect={() => setModal("share")}
              >
                <Share2 /> Share link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-accent focus:text-accent"
                onSelect={() => setModal("delete")}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* which slots are filled */}
        <ul className="flex flex-wrap gap-1.5" aria-label="Parts">
          {CATEGORIES.map((c) => {
            const has = !!d.resolved[c];
            return (
              <li
                key={c}
                title={`${CATEGORY_LABEL[c]}${has ? "" : " (empty)"}`}
              >
                <CategoryIcon
                  category={c}
                  className={cn(
                    "size-7",
                    !has && "bg-surface-2 text-fg-3 opacity-50",
                  )}
                />
                <span className="sr-only">
                  {CATEGORY_LABEL[c]}: {d.resolved[c]?.name ?? "empty"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <PriceTag value={d.totalIDR} size="md" label="Total" />
          <div className="flex items-center gap-2">
            <span className="spec text-spec-sm text-fg-3">
              {d.filled}/{CATEGORIES.length}
            </span>
            <BuildStatus
              errors={d.errors}
              warnings={d.warnings}
              filled={d.filled}
            />
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-line p-3">
        <Button
          variant={isOpen ? "primary" : "secondary"}
          size="sm"
          className="w-full"
          iconRight={<ArrowRight />}
          onClick={open}
        >
          {isOpen ? "Continue in builder" : "Open in builder"}
        </Button>
      </div>

      <ShareDialog
        build={build}
        open={modal === "share"}
        onOpenChange={(o) => setModal(o ? "share" : null)}
      />

      <Dialog
        open={modal === "rename"}
        onOpenChange={(o) => setModal(o ? "rename" : null)}
      >
        <DialogContent {...focus}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              renameBuild(build.id, draft);
              setModal(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename build</DialogTitle>
              <DialogDescription>Up to 60 characters.</DialogDescription>
            </DialogHeader>
            <label>
              <span className="sr-only">Build name</span>
              <input
                autoFocus
                value={draft}
                maxLength={60}
                onChange={(e) => setDraft(e.target.value)}
                className="h-10 w-full rounded-input border border-line bg-canvas px-3 text-ui text-fg focus-visible:border-line-strong focus-visible:outline-none"
              />
            </label>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Save name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === "delete"}
        onOpenChange={(o) => setModal(o ? "delete" : null)}
      >
        <DialogContent {...focus}>
          <DialogHeader>
            <DialogTitle>Delete “{build.name}”?</DialogTitle>
            <DialogDescription>
              It&apos;s removed from this browser. Share links you already sent
              keep working, because they hold their own copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              icon={<Trash2 />}
              onClick={() => {
                deleteBuild(build.id);
                setModal(null);
              }}
            >
              Delete build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
