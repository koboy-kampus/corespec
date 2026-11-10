"use client";

import { LazyMotion, m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () =>
  import("./motion-features").then((mod) => mod.default);

/**
 * Fade-up on scroll, once. Only opacity/transform animate, so there's no layout shift.
 * With prefers-reduced-motion it renders in place without moving.
 *
 * For sections below the fold only: it starts hidden until Motion runs, which would
 * delay LCP above the fold (the hero uses the CSS `hero-enter` animation instead).
 * LazyMotion + `m` keeps Motion's animation code in a separate, deferred chunk.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <LazyMotion features={loadFeatures} strict>
      <m.div
        className={className}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
