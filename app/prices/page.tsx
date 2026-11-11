import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/legal/doc-page";
import { formatDate } from "@/lib/format";
import { ESTIMATES_AS_OF, NEWEST_CHECK } from "@/lib/parts";
import { STALE_DAYS } from "@/lib/prices";
import { LEGAL_UPDATED } from "@/lib/site";

export const metadata: Metadata = {
  title: "Price disclaimer",
  description:
    "Prices on CoreSpec are estimates or hand-checked marketplace prices in Rupiah. Check the store before buying.",
};

export default function Page() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Price disclaimer"
      lead={
        <p>
          <strong className="text-fg">
            Prices are estimates or checked by hand, never live — check the
            store before buying.
          </strong>{" "}
          CoreSpec helps you plan a build. It is not a shop and its prices are
          not quotes.
        </p>
      }
      updated={`Updated ${formatDate(LEGAL_UPDATED)}`}
    >
      <DocSection title="Where the prices come from">
        <p>Every price is labelled with where it comes from:</p>
        <ul>
          <li>
            <strong>Checked</strong>, with a date: we found the item on
            Tokopedia, Shopee or Blibli and noted its price by hand on that day.
            When an item has more than one checked listing, CoreSpec shows the
            lowest. A check older than {STALE_DAYS} days gets a{" "}
            <em>Price may have changed</em> note.
          </li>
          <li>
            <strong>Estimate</strong>: an approximate street price, last updated
            on <strong>{formatDate(ESTIMATES_AS_OF)}</strong>.
          </li>
        </ul>
        <p>
          Totals add up the prices as shown, checked or estimate.
          {NEWEST_CHECK ? (
            <>
              {" "}
              The newest check was on{" "}
              <strong>{formatDate(NEWEST_CHECK)}</strong>.
            </>
          ) : null}{" "}
          Prices are not live: CoreSpec never reads them from a shop, and
          doesn&apos;t use any retailer&apos;s feed. The same goes for setup
          items (monitors, keyboards, desks and the rest).
        </p>
      </DocSection>

      <DocSection title="Links to shops">
        <p>
          An item with a checked listing has a <em>View on …</em> link to that
          exact listing. Otherwise you get <em>Search on Tokopedia</em> and{" "}
          <em>Search on Shopee</em>, which open the shop&apos;s own search for
          the product&apos;s name, so they never point at a product we
          haven&apos;t checked. Links open in a new tab. CoreSpec earns nothing
          from them: they aren&apos;t affiliate links, and checkout, stock and
          delivery are entirely up to the shop.
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
