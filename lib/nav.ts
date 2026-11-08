/** Shared navigation config for the navbar, mobile drawer, command palette and footer. */

export interface NavLink {
  label: string;
  /** Omit for pages that don't exist yet; they render as "Soon". */
  href?: string;
}

export const mainNav: NavLink[] = [
  { label: "Builder", href: "/builder" },
  { label: "Parts", href: "/parts" },
  { label: "Builds", href: "/builds" },
  { label: "About", href: "/about" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Builder", href: "/builder" },
      { label: "Parts", href: "/parts" },
      { label: "Builds", href: "/builds" },
      { label: "Presets" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "About", href: "/about" },
      { label: "Style guide", href: "/styleguide" },
      { label: "Compatibility rules" },
    ],
  },
  {
    title: "Community",
    links: [{ label: "Shared builds" }, { label: "Feedback" }],
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
