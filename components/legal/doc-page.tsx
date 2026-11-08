import type { ReactNode } from "react";

/** Plain reading layout for Privacy, Credits and the price disclaimer. */
export function DocPage({
  eyebrow,
  title,
  lead,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  /** e.g. "Updated 9 November 2026" */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="container-page flex max-w-3xl flex-col gap-10 py-12 md:py-16">
      <header className="flex flex-col gap-4">
        <p className="label-micro text-accent">{eyebrow}</p>
        <h1 className="text-display-sm text-balance">{title}</h1>
        <div className="text-[17px] leading-[26px] text-fg-2">{lead}</div>
        {updated ? (
          <p className="label-micro text-micro-sm text-fg-3">{updated}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-8">{children}</div>
    </article>
  );
}

/** One titled section of a DocPage. */
export function DocSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 className="text-h3">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-fg-2 [&_a]:text-fg [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-4 [&_a:hover]:decoration-accent [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-fg">
        {children}
      </div>
    </section>
  );
}
