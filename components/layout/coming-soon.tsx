import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ComingSoonProps {
  title: string;
  description: string;
  /** e.g. "Phase 4" */
  tag?: string;
}

/** Clean placeholder for routes that aren't built yet. */
export function ComingSoon({
  title,
  description,
  tag = "Coming soon",
}: ComingSoonProps) {
  return (
    <section className="container-page flex flex-1 items-center py-20">
      <Card
        padding="lg"
        className="mx-auto flex w-full max-w-xl flex-col items-start gap-5"
      >
        <Badge variant="accent">{tag}</Badge>
        <h1 className="text-display-sm text-fg">{title}</h1>
        <p className="text-body text-fg-2">{description}</p>
        <Button asChild variant="secondary" icon={<ArrowLeft />}>
          <Link href="/">Back home</Link>
        </Button>
      </Card>
    </section>
  );
}
