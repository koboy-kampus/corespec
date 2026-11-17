import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  return {
    // The style guide is internal. Shared builds stay crawlable so link-preview bots
    // (X respects robots.txt) can fetch their images; their pages say "noindex" instead.
    // Account pages (Phase 16) and the checkout simulation's pages (Phase 17a)
    // only exist when accounts are configured.
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: isSupabaseConfigured()
        ? ["/styleguide", "/account", "/admin", "/auth", "/checkout", "/orders"]
        : ["/styleguide"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
