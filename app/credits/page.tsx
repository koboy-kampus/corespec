import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { DocPage, DocSection } from "@/components/legal/doc-page";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { LEGAL_UPDATED } from "@/lib/site";
import { FONTS, SOFTWARE } from "@/lib/software";
import { ATTRIBUTION_REQUIRED, CREDITS } from "@/lib/viewer/models";

export const metadata: Metadata = {
  title: "Credits",
  description:
    "The 3D models, open-source software and fonts that CoreSpec is built with.",
};

export default function Page() {
  return (
    <DocPage
      eyebrow="Thanks"
      title="Credits"
      lead="CoreSpec is built on other people's generous work. These are the 3D models, software and fonts it uses, with their licences."
      updated={`Updated ${formatDate(LEGAL_UPDATED)}`}
    >
      <DocSection title="3D models">
        <p>Parts without a model listed here are drawn by CoreSpec itself.</p>
        <ul className="flex flex-col gap-3 [&>li]:ml-0 [&>li]:list-none">
          {CREDITS.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-btn border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <a href={c.url} target="_blank" rel="noreferrer">
                  “{c.title}”
                </a>
                <span>by {c.author}</span>
                <Badge
                  variant={
                    ATTRIBUTION_REQUIRED.includes(c.licence)
                      ? "accent"
                      : "neutral"
                  }
                >
                  {c.licence}
                </Badge>
              </div>
              <p className="text-[14px] leading-5">
                Used for: {c.usedFor}. Licence:{" "}
                <a href={c.licenceUrl} target="_blank" rel="noreferrer">
                  {c.licence}
                </a>
                . Changes: {c.changes}
              </p>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="Software">
        <ul>
          {SOFTWARE.map((s) => (
            <li key={s.pkg}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>{" "}
              · {s.licence}
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="Fonts">
        <ul>
          {FONTS.map((f) => (
            <li key={f.name}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.name}
              </a>{" "}
              · {f.licence}
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-1.5 text-[14px] leading-5 text-fg-3">
          <ExternalLink className="size-3.5" aria-hidden />
          Links open the original project in a new tab.
        </p>
      </DocSection>
    </DocPage>
  );
}
