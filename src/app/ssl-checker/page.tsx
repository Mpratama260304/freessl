import { Checker } from "@/components/checker/checker";
import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata("SSL Certificate Checker", "Inspect a public site's certificate, expiry, SANs, trust chain, TLS version and cipher.", "/ssl-checker");
export default function SslCheckerPage() {
  return <div className="container page-shell"><div className="page-heading"><span className="eyebrow">Trust, verified</span><h1>Know what&apos;s behind the lock.</h1><p>Inspect your SSL certificate, check its expiration, and see how your site connects.</p></div><Checker kind="ssl" /></div>;
}