import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${site.siteUrl}/sitemap.xml` };
}