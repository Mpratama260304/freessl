"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleHelp, Clock3, Globe2, LoaderCircle, LockKeyhole, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { ErrorMessage, TechnicalValue } from "@/components/common";
import { normalizeDomain, hasWildcard } from "@/lib/validation/domains";
import { postJson } from "@/lib/client-api";
import type { SecurityReport, SslReport } from "@/lib/checkers";

function ReportField({ label, value }: { label: string; value: string }) {
  return <div className="report-field"><dt>{label}</dt><dd>{value}</dd></div>;
}

export function Checker({ kind }: { kind: "ssl" | "security" }) {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ssl, setSsl] = useState<SslReport | null>(null);
  const [security, setSecurity] = useState<SecurityReport | null>(null);
  const [checkedDomain, setCheckedDomain] = useState("");

  async function check() {
    setError(""); setSsl(null); setSecurity(null);
    try {
      const normalized = normalizeDomain(domain);
      if (hasWildcard([normalized])) throw new Error("Enter a specific hostname, such as www.example.com.");
      setDomain(normalized); setCheckedDomain(normalized); setBusy(true);
      if (kind === "ssl") setSsl(await postJson<SslReport>("/api/ssl-checker", { domain: normalized }));
      else setSecurity(await postJson<SecurityReport>("/api/security-check", { domain: normalized }));
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="checker-workspace"><form className="checker-form" onSubmit={(event) => { event.preventDefault(); void check(); }}><div className="grow-field"><label className="field-label" htmlFor="checker-domain">Public domain name</label><div className="domain-input"><Globe2 size={19} /><GlassInput id="checker-domain" placeholder="example.com" value={domain} onChange={(event) => setDomain(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={2048} /></div></div><GlassButton variant="primary" size="lg" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Search />}{kind === "ssl" ? "Check SSL" : "Check security"}</GlassButton></form>
    {error && <ErrorMessage message={error} />}
    {busy && <div className="report-loading" role="status"><div className="loading-heading"><LoaderCircle className="spin" size={20} /><span>Checking the public endpoint for {checkedDomain}...</span></div><div className="skeleton-grid">{[0, 1, 2, 3].map((index) => <div className="skeleton" key={index} />)}</div></div>}
    {!busy && !ssl && !security && !error && <div className="checker-empty"><div className="empty-symbol">{kind === "ssl" ? <LockKeyhole size={34} /> : <ShieldCheck size={34} />}</div><h2>{kind === "ssl" ? "A closer look at your connection." : "Good security starts with the basics."}</h2><p>{kind === "ssl" ? "Check any public website's SSL certificate, trust chain, expiration, and negotiated TLS connection." : "Review HTTPS, security headers, and CAA records without intrusive scanning."}</p><div className="empty-tags"><span><CheckCircle2 size={14} /> No account required</span><span><ShieldCheck size={14} /> Read-only checks</span></div></div>}
    {ssl && <section className="report" aria-label="SSL certificate report"><div className="report-heading"><div><span className="eyebrow">Certificate report</span><h2>{ssl.domain}</h2></div><GlassBadge variant={ssl.status === "Valid" ? "success" : ssl.status === "Expiring soon" ? "warning" : "destructive"}>{ssl.status === "Valid" ? <CheckCircle2 size={15} className="mr-2" /> : <TriangleAlert size={15} className="mr-2" />}{ssl.status}</GlassBadge></div><div className="report-overview"><div><span>Days remaining</span><strong className={ssl.daysRemaining < 30 ? "text-error" : "text-success"}>{ssl.daysRemaining}</strong><small>Based on certificate expiration</small></div><div><span>Certificate issuer</span><strong className="report-issuer">{ssl.issuer}</strong><small>{ssl.trusted ? "Trusted by this server's trust store" : "Not trusted by this server's trust store"}</small></div><div><span>Hostname match</span><strong>{ssl.hostnameMatch ? "Matched" : "Mismatch"}</strong><small>{ssl.commonName}</small></div></div><h3 className="report-subheading">Certificate details</h3><dl className="report-grid"><ReportField label="Subject" value={ssl.subject} /><ReportField label="Common name" value={ssl.commonName} /><ReportField label="Valid from" value={new Date(ssl.validFrom).toLocaleString()} /><ReportField label="Valid until" value={new Date(ssl.validUntil).toLocaleString()} /><ReportField label="Negotiated TLS version" value={ssl.protocol ?? "Unavailable"} /><ReportField label="Cipher" value={ssl.cipher} /></dl><TechnicalValue label="SHA-256 fingerprint" value={ssl.fingerprint} /><h3 className="report-subheading">Subject alternative names</h3><ul className="san-list">{ssl.sans.map((name) => <li key={name}><Globe2 size={14} /><code>{name.replace(/^DNS:/, "")}</code></li>)}</ul><h3 className="report-subheading">Certificate chain</h3><ol className="chain-list">{ssl.chain.map((certificate, index) => <li key={`${certificate.subject}-${index}`}><div className="chain-number">{index + 1}</div><div><h4>{certificate.subject}</h4><p>Issued by {certificate.issuer}</p><small>Valid until {certificate.validUntil}</small></div></li>)}</ol><p className="report-timestamp"><Clock3 size={14} /> Checked {new Date(ssl.checkedAt).toLocaleString()}. Trust is evaluated using the server&apos;s CA store, without an OCSP revocation check.</p></section>}
    {security && <section className="report" aria-label="Security configuration report"><div className="report-heading"><div><span className="eyebrow">Security configuration</span><h2>{security.domain}</h2></div><GlassBadge size="sm">Read-only report</GlassBadge></div><div className="notice notice-info"><CircleHelp size={19} /><p>This is an informational snapshot, not a vulnerability assessment. A present header is not necessarily a secure policy. Review each recommendation in context.</p></div>{security.finalUrl && <TechnicalValue label="HTTPS endpoint inspected" value={security.finalUrl} />}<div className="security-findings">{security.findings.map((finding) => <article key={finding.name} className="security-finding"><div className="finding-title">{finding.status === "pass" ? <CheckCircle2 className="text-success" size={20} /> : finding.status === "review" ? <TriangleAlert className="text-warning" size={20} /> : <CircleHelp className="text-muted" size={20} />}<h3>{finding.name}</h3><GlassBadge size="sm" variant={finding.status === "pass" ? "success" : finding.status === "review" ? "warning" : "default"}>{finding.status === "pass" ? "Observed" : finding.status === "review" ? "Review" : "Unknown"}</GlassBadge></div><code>{finding.value}</code><p>{finding.recommendation}</p></article>)}</div><p className="report-timestamp"><Clock3 size={14} /> Checked {new Date(security.checkedAt).toLocaleString()}. No port scanning, exploitation, or brute force is performed.</p></section>}
    <div className="checker-help"><ShieldCheck size={20} /><div><h3>{kind === "ssl" ? "Need a new certificate?" : "A strong foundation starts with HTTPS."}</h3><p>{kind === "ssl" ? "Generate a free Let's Encrypt certificate for a domain you control." : "Start with a trusted certificate, then review your server configuration."}</p></div><a href="/generate" className="text-link">Generate SSL <ArrowRight size={16} /></a></div>
  </div>;
}