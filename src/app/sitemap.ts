import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { guides } from "@/config/guides";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/generate", "/ssl-checker", "/security-check", "/guides", "/faq", "/privacy", "/terms", ...guides.map((guide) => `/guides/${guide.slug}`)].map((path) => ({ url: `${site.siteUrl}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : path === "/generate" ? .9 : .6 }));
}