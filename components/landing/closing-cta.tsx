import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function ClosingCTA() {
  return (
    <section>
      <div className="container-page py-20 lg:py-28">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          <p className="label-micro text-accent">03 · Ready when you are</p>
          <h2 className="text-display-sm text-balance md:text-display">
            Your next PC starts with one part.
          </h2>
          <p className="max-w-lg text-[17px] leading-[26px] text-fg-2">
            Free, no sign-up, and every price in Rupiah.
          </p>
          <Button
            asChild
            size="lg"
            iconRight={
              <ArrowRight className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
            }
          >
            <Link href="/builder">Start Building</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
