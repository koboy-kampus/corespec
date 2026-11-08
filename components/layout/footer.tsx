import Link from "next/link";
import { footerNav, type NavLink } from "@/lib/nav";
import { Logo } from "./logo";

const titleBlock = [
  { k: "Drawing", v: "CORESPEC" },
  { k: "Rev", v: "0.1" },
  { k: "Scale", v: "1:1" },
  { k: "Sheet", v: "01/01" },
  { k: "Year", v: "© 2026" },
];

function FooterLink({ link }: { link: NavLink }) {
  if (!link.href) {
    return (
      <span className="text-ui text-fg-3">
        {link.label}
        <span className="ml-2 inline-block label-micro text-micro-sm whitespace-nowrap text-fg-3">
          Soon
        </span>
      </span>
    );
  }
  return (
    <Link
      href={link.href}
      className="rounded-chip text-ui text-fg-2 transition-colors duration-150 hover:text-fg"
    >
      {link.label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-page flex flex-col gap-12 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)] md:gap-8">
          <div className="flex flex-col gap-4">
            <Logo showBeta={false} />
            <p className="text-body text-fg-2">Spec it. See it. Build it.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:contents">
            {footerNav.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="label-micro text-fg-3">{col.title}</p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Engineering-drawing title block */}
        {/* gap-px over a slate background draws the hairlines between cells */}
        <dl
          aria-label="Title block: CORESPEC · REV 0.1 · SCALE 1:1 · SHEET 01/01 · © 2026"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-input border border-line-strong/60 bg-line-strong/60 sm:grid-cols-[2fr_repeat(4,1fr)]"
        >
          {titleBlock.map((cell, i) => (
            <div
              key={cell.k}
              className={`flex flex-col gap-1 bg-canvas px-4 py-3 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <dt className="label-micro text-micro-sm text-fg-3">{cell.k}</dt>
              <dd className="font-plex text-[13px] leading-[18px] tracking-[0.06em] text-fg">
                {cell.v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </footer>
  );
}
