/** Public site URL for absolute links (sitemap, share previews). Vercel sets this; it is not a key. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

/** Pages listed in the sitemap. Placeholder pages and shared builds are left out. */
export const INDEXED_PATHS = [
  "/",
  "/builder",
  "/builds",
  "/about",
  "/prices",
  "/credits",
  "/privacy",
] as const;

/** When the Privacy, Credits and price pages were last reviewed. */
export const LEGAL_UPDATED = "2026-11-11";

/** Public contact address for privacy questions, shown on the Privacy page. */
export const CONTACT_EMAIL = "syahreyhanpratamanandi@gmail.com";

/** Error reporting is on only when a Sentry DSN is configured (see .env.example). */
export const ERROR_REPORTING_ENABLED = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
