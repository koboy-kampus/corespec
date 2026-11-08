import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/legal/doc-page";
import { formatDate } from "@/lib/format";
import {
  CONTACT_EMAIL,
  ERROR_REPORTING_ENABLED,
  LEGAL_UPDATED,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What CoreSpec stores and sends: no accounts, no cookies, builds kept in your browser.",
};

export default function Page() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Privacy"
      lead="CoreSpec has no accounts, sets no cookies and never sells data. Here is exactly what is stored and what leaves your browser."
      updated={`Updated ${formatDate(LEGAL_UPDATED)}`}
    >
      <DocSection title="Your builds stay in your browser">
        <p>
          Builds are saved automatically in your browser&apos;s local storage
          (under the name <code className="spec">corespec-build</code>). They
          are never uploaded to us. Clearing this site&apos;s data in your
          browser deletes them, and they don&apos;t follow you to other browsers
          or devices.
        </p>
      </DocSection>

      <DocSection title="Share links">
        <p>
          When you share a build, its part list and name are packed into the
          link itself. Our server reads the link to show the page, but we
          don&apos;t keep a copy. Anyone who has the link can see the build,
          including its name, so don&apos;t put personal details in a build name
          you plan to share. Like any website host, our hosting provider may
          keep standard request logs, which include the page address.
        </p>
      </DocSection>

      <DocSection title="Analytics">
        <p>
          We use Vercel Web Analytics to count page views. It works without
          cookies and doesn&apos;t identify you or follow you to other sites. It
          records things like the page visited, the referring site, your country
          and your device and browser type, and we only ever see totals.
        </p>
      </DocSection>

      <DocSection title="Error reports">
        <p>
          {ERROR_REPORTING_ENABLED
            ? "When something crashes, a technical report is sent to Sentry so we can fix it: the error message, the page address and your browser type. It is set up not to send personal data such as your IP address."
            : "Error reporting is currently switched off, so no crash reports are sent anywhere. If we turn it on, reports will go to Sentry with technical details only (the error, the page address and your browser type), and this page will say so."}
        </p>
      </DocSection>

      <DocSection title="No third-party requests">
        <p>
          Fonts, 3D models and the 3D decoder are served from CoreSpec itself.
          We don&apos;t load ads, trackers or social media widgets.
        </p>
      </DocSection>

      <DocSection title="Questions">
        <p>
          {CONTACT_EMAIL ? (
            <>
              Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with
              any privacy question.
            </>
          ) : (
            "A contact address for privacy questions will be listed here before CoreSpec's public launch."
          )}{" "}
          See also the <Link href="/prices">price disclaimer</Link> and{" "}
          <Link href="/credits">credits</Link>.
        </p>
      </DocSection>
    </DocPage>
  );
}
