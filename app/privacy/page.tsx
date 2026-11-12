import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/legal/doc-page";
import { formatDate } from "@/lib/format";
import {
  CONTACT_EMAIL,
  ERROR_REPORTING_ENABLED,
  LEGAL_UPDATED,
} from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Accounts (Phase 16) exist only when Supabase is configured; without it this
// page reads exactly as before.
const accounts = isSupabaseConfigured();

export const metadata: Metadata = {
  title: "Privacy",
  description: accounts
    ? "What CoreSpec stores and sends: optional accounts, builds kept in your browser unless you log in."
    : "What CoreSpec stores and sends: no accounts, no cookies, builds kept in your browser.",
};

export default function Page() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Privacy"
      lead={
        accounts
          ? "CoreSpec works without an account and never sells data. Cookies are only set if you log in. Here is exactly what is stored and what leaves your browser."
          : "CoreSpec has no accounts, sets no cookies and never sells data. Here is exactly what is stored and what leaves your browser."
      }
      updated={`Updated ${formatDate(LEGAL_UPDATED)}`}
    >
      <DocSection title="Your builds stay in your browser">
        <p>
          Builds are saved automatically in your browser&apos;s local storage
          (under the name <code className="spec">corespec-build</code>).{" "}
          {accounts
            ? "Unless you log in, they are never uploaded to us. Clearing this site's data in your browser deletes them, and they don't follow you to other browsers or devices."
            : "They are never uploaded to us. Clearing this site's data in your browser deletes them, and they don't follow you to other browsers or devices."}
        </p>
      </DocSection>

      {accounts ? (
        <DocSection title="If you create an account">
          <p>
            An account is optional. If you make one, we store your email
            address, the display name you choose, a securely hashed password and
            the builds you keep in your account (their names and part lists).
            This is held by our database provider, Supabase, in Singapore.
            Builds you made before logging in stay only in your browser unless
            you choose to import them.
          </p>
          <p>
            Logging in sets cookies that keep you logged in: the session itself
            (which scripts on the page can&apos;t read) and a small{" "}
            <code className="spec">cs-auth</code> cookie that only says you are
            logged in, so the menu can show your account. They are removed when
            you log out. Admins can see each account&apos;s display name, email,
            sign-up date and number of builds, but not the builds themselves.
          </p>
          <p>
            You can delete your account at any time from My account. That
            deletes your profile and every build in it straight away.
          </p>
        </DocSection>
      ) : null}

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
