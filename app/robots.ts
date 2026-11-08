import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The style guide is internal. Shared builds stay crawlable so link-preview bots
    // (X respects robots.txt) can fetch their images; their pages say "noindex" instead.
    rules: { userAgent: "*", allow: "/", disallow: ["/styleguide"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
