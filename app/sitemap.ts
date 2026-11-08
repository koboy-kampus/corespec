import type { MetadataRoute } from "next";
import { PRICES_AS_OF } from "@/lib/parts";
import { INDEXED_PATHS, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    // Content changes when prices are refreshed.
    lastModified: PRICES_AS_OF,
    changeFrequency: path === "/" || path === "/builder" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/builder" ? 0.9 : 0.5,
  }));
}
