import { Checker } from "@/components/checker/checker";
import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata("Website Security Check", "Review HTTPS, redirects, TLS, browser security headers and CAA DNS without invasive scanning.", "/security-check");
export default function SecurityCheckPage() {
  return <div className="container page-shell"><div className="page-heading"><span className="eyebrow">Small details. Meaningful protection.</span><h1>Check your security essentials.</h1><p>A read-only look at your public HTTPS configuration, security headers, and DNS policy.</p></div><Checker kind="security" /></div>;
}