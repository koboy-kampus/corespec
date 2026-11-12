import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/legal/doc-page";
import { formatDate } from "@/lib/format";
import { CATALOG_STATS, PRICES_AS_OF } from "@/lib/parts";

export const metadata: Metadata = {
  title: "About",
  description:
    "What CoreSpec is, how prices and compatibility checks work, and who made it.",
};

export default function Page() {
  return (
    <DocPage
      eyebrow="About"
      title="About CoreSpec"
      lead="CoreSpec is a free 3D PC builder for Indonesian buyers. Pick parts, watch them go into a to-scale case, catch compatibility problems before you pay, and see the cost in Rupiah."
    >
      <DocSection title="What it does">
        <ul>
          <li>
            Builds a PC from {CATALOG_STATS.parts} parts across{" "}
            {CATALOG_STATS.categories} categories, drawn in 3D at real size.
          </li>
          <li>
            Adds the rest of the desk: {CATALOG_STATS.setupItems} setup items
            across {CATALOG_STATS.setupCategories} categories (monitor,
            keyboard, mouse, chair, desk and more), shown on a 3D desk, with PC,
            setup and total costs.
          </li>
          <li>
            Sorts every category into Budget, Mid and High-end, and links each
            item to Tokopedia or Shopee: a listing checked by hand where there
            is one, otherwise a marketplace search.
          </li>
          <li>
            Checks compatibility as you go: CPU socket, memory type, RAM slots,
            board and case size, GPU length, cooler height and power supply. For
            the desk: monitor against the graphics card, desk width, monitor arm
            limits and adaptive sync.
          </li>
          <li>Estimates power draw against your PSU.</li>
          <li>
            Saves your builds in your browser and shares any build as a link.
          </li>
        </ul>
        <p>
          There are no accounts and no sign-up. Start in the{" "}
          <Link href="/builder">builder</Link>.
        </p>
      </DocSection>

      <DocSection title="Prices are checked or estimated">
        <p>
          Prices are in Rupiah. Some were checked by hand on a marketplace and
          are marked Checked with their date; the rest are estimates. The newest
          check is from <strong>{formatDate(PRICES_AS_OF)}</strong>. They are
          not live and CoreSpec isn&apos;t a shop, so always confirm in the
          store before buying. The <Link href="/prices">price page</Link> has
          the details.
        </p>
      </DocSection>

      <DocSection title="Who made it">
        <p>
          CoreSpec is made by Rei, an Informatics student at Gunadarma
          University in Indonesia. It isn&apos;t affiliated with any shop or
          manufacturer.
        </p>
        <p lang="id">
          Syah Reihan Pratama Nandi · NPM 51421454 · Informatika, Universitas
          Gunadarma · Penulisan Ilmiah 2026
        </p>
      </DocSection>

      <DocSection title="How it's built">
        <p>
          Next.js and React with TypeScript, styled with Tailwind CSS. The 3D
          view uses three.js through React Three Fiber, and builds are kept in
          your browser with Zustand, and it is set up to run on Vercel. The 3D
          models, open-source software and fonts are listed on the{" "}
          <Link href="/credits">credits page</Link>, and what is stored about
          you is on the <Link href="/privacy">privacy page</Link>.
        </p>
      </DocSection>
    </DocPage>
  );
}
