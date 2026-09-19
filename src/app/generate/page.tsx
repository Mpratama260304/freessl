import { Generator } from "@/components/ssl/generator";
import { config } from "@/config/env";
import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata("Generate Free SSL", "Create a real Let's Encrypt certificate with DNS or HTTP validation. Your private key is generated in your browser.", "/generate");

export default async function GeneratePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const settings = config();
  return <div className="container page-shell"><div className="page-heading"><span className="eyebrow">A secure connection starts here</span><h1>Generate your SSL certificate.</h1><p>Five clear steps. Zero accounts to create.</p></div><Generator initialDomain={typeof params.domain === "string" ? params.domain.slice(0, 2048) : ""} initialMethod={params.method === "http-01" ? "http-01" : "dns-01"} maximum={settings.MAX_DOMAINS_PER_CERT} environment={settings.ACME_ENVIRONMENT} /></div>;
}