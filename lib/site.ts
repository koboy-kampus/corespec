/** Public site URL for absolute links (sitemap, share previews). Vercel sets this; it is not a key. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

/** Pages listed in the sitemap. Placeholder pages and shared builds are left out. */
export const INDEXED_PATHS = ["/", "/builder", "/builds", "/about"] as const;
