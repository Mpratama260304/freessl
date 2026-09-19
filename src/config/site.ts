import type { Metadata } from "next";

export const site = {
  name: "Certlane",
  description: "Generate free Let's Encrypt SSL certificates with DNS or HTTP verification. No account required.",
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
  logo: { monogram: "C", image: "/icon", width: 36, height: 36 },
  social: { title: "Free SSL Certificate Generator | Certlane", image: "/opengraph-image", twitterCard: "summary_large_image" as const },
  supportEmail: process.env.SUPPORT_EMAIL || undefined,
};

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { title: `${title} | ${site.name}`, description, url: path, images: [site.social.image] }, twitter: { card: site.social.twitterCard, title, description, images: [site.social.image] } };
}