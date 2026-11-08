import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/** 404: unknown URLs and share links that can't be read. */
export default function NotFound() {
  return (
    <section className="container-page flex flex-1 items-center py-20">
      <Card
        padding="lg"
        className="mx-auto flex w-full max-w-xl flex-col items-start gap-5"
      >
        <Badge variant="accent">Error 404</Badge>
        <h1 className="text-display-sm text-fg">
          This part isn&apos;t in stock
        </h1>
        <p className="text-body text-fg-2">
          We couldn&apos;t find that page. If someone sent you a build link, it
          may have been cut off when it was copied: ask them to share it again.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild icon={<Wrench />}>
            <Link href="/builder">Open the builder</Link>
          </Button>
          <Button asChild variant="secondary" icon={<ArrowLeft />}>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
