import type { Metadata } from "next";

const siteName = "FreeSSL";

export function getSiteUrl(input: Record<string, string | undefined> = {
  SITE_URL: process.env.SITE_URL,
  NODE_ENV: process.env.NODE_ENV,
}) {
  return input.SITE_URL ?? (input.NODE_ENV === "production" ? "https://freessl.run" : "http://localhost:3000");
}

export const site = {
  name: siteName,
  description: "Generate free Let's Encrypt SSL certificates with DNS or HTTP verification. No account required.",
  siteUrl: getSiteUrl(),
  logo: { monogram: "F", image: "/icon", width: 36, height: 36 },
  social: { title: `Free SSL Certificate Generator | ${siteName}`, image: "/opengraph-image", twitterCard: "summary_large_image" as const },
  supportEmail: process.env.SUPPORT_EMAIL || undefined,
};

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const brandedTitle = `${title} | ${site.name}`;
  return { title: { absolute: brandedTitle }, description, alternates: { canonical: path }, openGraph: { title: brandedTitle, siteName: site.name, description, url: path, images: [site.social.image] }, twitter: { card: site.social.twitterCard, title: brandedTitle, description, images: [site.social.image] } };
}