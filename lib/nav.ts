/** Shared navigation config for the navbar, mobile drawer, command palette and footer. */

export interface NavLink {
  label: string;
  /** Omit for pages that don't exist yet; they render as "Soon". */
  href?: string;
}

export const mainNav: NavLink[] = [
  { label: "Builder", href: "/builder" },
  { label: "Builds", href: "/builds" },
  { label: "About", href: "/about" },
];

/** A footer link always points at a real page: no "Soon" placeholders. */
export interface FooterLink {
  label: string;
  href: string;
}

export const footerNav: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Builder", href: "/builder" },
      { label: "Builds", href: "/builds" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "About", href: "/about" },
      { label: "Style guide", href: "/styleguide" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Credits", href: "/credits" },
      { label: "Price disclaimer", href: "/prices" },
    ],
  },
];
