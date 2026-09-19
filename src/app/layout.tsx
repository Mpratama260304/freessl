import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import { site } from "@/config/site";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: { default: site.social.title, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: "website", locale: "en_US", siteName: site.name, images: [site.social.image] },
  twitter: { card: site.social.twitterCard },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f9f8" }, { media: "(prefers-color-scheme: dark)", color: "#111816" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return <html lang="en" suppressHydrationWarning><body><Providers nonce={nonce}><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main">{children}</main><Footer /></Providers></body></html>;
}