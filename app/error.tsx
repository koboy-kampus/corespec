"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Catches errors in any page below the root layout; the navbar and footer stay. */
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <section className="container-page flex flex-1 items-center py-20">
      <Card
        padding="lg"
        className="mx-auto flex w-full max-w-xl flex-col items-start gap-5"
      >
        <Badge variant="error">Something went wrong</Badge>
        <h1 className="text-display-sm text-fg">That didn&apos;t boot</h1>
        <p className="text-body text-fg-2">
          This page hit an error. Your saved builds are stored in this browser
          and are safe. Try again, or head back home.
        </p>
        {digest ? (
          <p className="spec text-spec-sm text-fg-3">Error ref: {digest}</p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button icon={<RotateCcw />} onClick={() => retry()}>
            Try again
          </Button>
          <Button asChild variant="secondary" icon={<ArrowLeft />}>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
