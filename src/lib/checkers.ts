import { Resolver } from "node:dns/promises";
import type { DetailedPeerCertificate } from "node:tls";
import { inspectTls, safeRequest, validateRedirect } from "./network/safe-network";

export async function sslReport(domain: string) {
  const result = await inspectTls(domain);
  const certificate = result.certificate;
  const validFrom = new Date(certificate.valid_from).toISOString();
  const validUntil = new Date(certificate.valid_to).toISOString();
  const daysRemaining = Math.floor((new Date(validUntil).getTime() - Date.now()) / 86400000);
  const status = daysRemaining < 0 ? "Expired" : !result.hostnameMatch ? "Hostname mismatch" : !result.authorized ? "Not trusted" : new Date(validFrom).getTime() > Date.now() ? "Not yet valid" : daysRemaining < 30 ? "Expiring soon" : "Valid";
  const chain: { subject: string; issuer: string; validUntil: string }[] = [];
  const seen = new Set<string>();
  let item: DetailedPeerCertificate | undefined = certificate;
  while (item && chain.length < 10 && !seen.has(item.fingerprint256)) {
    seen.add(item.fingerprint256);
    chain.push({ subject: String(item.subject.CN ?? "Unknown"), issuer: String(item.issuer.CN ?? "Unknown"), validUntil: item.valid_to });
    item = item.issuerCertificate;
  }
  return { domain, status, issuer: String(certificate.issuer.O ?? certificate.issuer.CN ?? "Unknown"), subject: Object.entries(certificate.subject).map(([key, value]) => `${key}=${value}`).join(", "), commonName: String(certificate.subject.CN ?? "Not specified"), sans: certificate.subjectaltname?.split(", ") ?? [], validFrom, validUntil, daysRemaining, fingerprint: certificate.fingerprint256, protocol: result.protocol, cipher: result.cipher.name, hostnameMatch: result.hostnameMatch, trusted: result.authorized, chain, checkedAt: new Date().toISOString() };
}

export type SslReport = Awaited<ReturnType<typeof sslReport>>;
export interface SecurityFinding { name: string; status: "pass" | "review" | "unknown"; value: string; recommendation: string }

async function caaRecords(domain: string): Promise<string[]> {
  const resolver = new Resolver({ timeout: 2500, tries: 1 });
  const labels = domain.split(".");
  while (labels.length > 1) {
    try {
      const records = await resolver.resolveCaa(labels.join("."));
      if (records.length) return records.map((record) => JSON.stringify(record));
    } catch (error) {
      if (!["ENODATA", "ENOTFOUND"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
    }
    labels.shift();
  }
  return [];
}

export async function securityReport(domain: string) {
  const [httpsResult, httpResult, tlsResult, caaResult] = await Promise.allSettled([
    safeRequest(new URL(`https://${domain}/`), { method: "HEAD", redirects: 3 }),
    safeRequest(new URL(`http://${domain}/`), { method: "HEAD" }),
    inspectTls(domain),
    caaRecords(domain),
  ]);
  const findings: SecurityFinding[] = [];
  findings.push({ name: "HTTPS", status: httpsResult.status === "fulfilled" ? "pass" : "review", value: httpsResult.status === "fulfilled" ? `Responded with HTTP ${httpsResult.value.status}` : "Could not establish trusted HTTPS", recommendation: "Serve the site over HTTPS with a trusted, current certificate." });
  let redirectsToHttps = false;
  if (httpResult.status === "fulfilled" && [301, 302, 303, 307, 308].includes(httpResult.value.status) && httpResult.value.headers.location) {
    try { redirectsToHttps = validateRedirect(new URL(`http://${domain}/`), httpResult.value.headers.location, false).protocol === "https:"; } catch {}
  }
  findings.push({ name: "HTTP to HTTPS", status: redirectsToHttps ? "pass" : "review", value: redirectsToHttps ? "HTTPS redirect advertised" : "No direct HTTPS redirect detected", recommendation: "Redirect all HTTP traffic to HTTPS. A redirect header alone does not prove the destination works." });
  findings.push({ name: "TLS support", status: tlsResult.status === "fulfilled" ? "pass" : "review", value: tlsResult.status === "fulfilled" ? tlsResult.value.protocol ?? "TLS negotiated" : "TLS 1.2+ unavailable", recommendation: "Prefer TLS 1.3 and support TLS 1.2 where necessary. This check does not enumerate or rule out older protocols." });
  const checks = [
    ["Strict-Transport-Security", "Use HSTS after confirming HTTPS works across the intended hostnames."],
    ["Content-Security-Policy", "Define and test a restrictive CSP appropriate for the site's scripts and resources."],
    ["X-Frame-Options", "Set DENY or SAMEORIGIN, or use CSP frame-ancestors, to control embedding."],
    ["X-Content-Type-Options", "Set this header to nosniff."],
    ["Referrer-Policy", "Use strict-origin-when-cross-origin or a stricter policy."],
    ["Permissions-Policy", "Explicitly restrict browser features the site does not need."],
  ];
  for (const [name, recommendation] of checks) {
    const value = httpsResult.status === "fulfilled" ? httpsResult.value.headers[name.toLowerCase()] : undefined;
    findings.push({ name: name === "Strict-Transport-Security" ? "HSTS" : name, status: httpsResult.status !== "fulfilled" ? "unknown" : value ? "pass" : "review", value: value ? String(value).slice(0, 2048) : "Not detected", recommendation });
  }
  findings.push({ name: "CAA DNS", status: caaResult.status === "rejected" ? "unknown" : caaResult.value.length ? "pass" : "review", value: caaResult.status === "fulfilled" ? caaResult.value.join("; ") || "No inherited or direct CAA policy found" : "DNS lookup unavailable", recommendation: "CAA can restrict certificate issuance to authorized CAs. Let's Encrypt's CAA identifier is letsencrypt.org. Presence does not mean the policy permits issuance." });
  return { domain, checkedAt: new Date().toISOString(), finalUrl: httpsResult.status === "fulfilled" ? httpsResult.value.url : null, findings };
}

export type SecurityReport = Awaited<ReturnType<typeof securityReport>>;