import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/legal/doc-page";
import { formatDate } from "@/lib/format";
import { PRICES_AS_OF } from "@/lib/parts";
import { LEGAL_UPDATED } from "@/lib/site";

export const metadata: Metadata = {
  title: "Price disclaimer",
  description:
    "Prices on CoreSpec are estimates in Rupiah. Check the store before buying.",
};

export default function Page() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Price disclaimer"
      lead={
        <p>
          <strong className="text-fg">
            Prices are estimates — check the store before buying.
          </strong>{" "}
          CoreSpec helps you plan a build. It is not a shop and its prices are
          not quotes.
        </p>
      }
      updated={`Updated ${formatDate(LEGAL_UPDATED)}`}
    >
      <DocSection title="Where the prices come from">
        <p>
          Prices are estimates and are being checked against Indonesian stores.
          Always confirm in the store before buying. The current prices were
          last updated on <strong>{formatDate(PRICES_AS_OF)}</strong>, and that
          date also appears at the bottom of the builder. They are not live and
          don&apos;t come from any retailer&apos;s feed.
        </p>
      </DocSection>

      <DocSection title="Why the real price can differ">
        <ul>
          <li>Shops change prices often, and promotions come and go.</li>
          <li>Stock, region, shipping and tax all move the final price.</li>
          <li>Rupiah prices for imported parts follow the exchange rate.</li>
          <li>Bundles and marketplace sellers can be cheaper or dearer.</li>
        </ul>
      </DocSection>

      <DocSection title="Not affiliated with any store or brand">
        <p>
          CoreSpec doesn&apos;t sell parts, doesn&apos;t use affiliate links and
          isn&apos;t affiliated with any shop or manufacturer. Product and brand
          names belong to their owners and are used only to identify parts.
        </p>
      </DocSection>

      <DocSection title="Checks and estimates">
        <p>
          Compatibility checks and wattage figures are based on published
          specifications and simple rules, so they can miss edge cases, such as
          a BIOS update or an unusual cooler mount. Performance (FPS) figures
          are always labelled as illustrative estimates. Confirm the details
          with the manufacturer before you buy.
        </p>
        <p>
          How we handle your data is on the{" "}
          <Link href="/privacy">privacy page</Link>.
        </p>
      </DocSection>
    </DocPage>
  );
}
