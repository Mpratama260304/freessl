"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Globe2, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { normalizeDomain } from "@/lib/validation/domains";
import { ErrorMessage } from "@/components/common";

export function QuickGenerator() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [method, setMethod] = useState("dns-01");
  const [error, setError] = useState("");
  const wildcard = domain.trim().startsWith("*.");
  return <GlassCard className="quick-generator"><form onSubmit={(event) => {
    event.preventDefault();
    try { const normalized = normalizeDomain(domain); router.push(`/generate?domain=${encodeURIComponent(normalized)}&method=${wildcard ? "dns-01" : method}`); }
    catch (failure) { setError((failure as Error).message); }
  }}>
    <div className="tool-heading"><div className="icon-box"><LockKeyhole size={20} /></div><div><h2>Let&apos;s secure your domain</h2><p>A trusted certificate. A straightforward process.</p></div><span className="free-label">100% free</span></div>
    <label className="field-label" htmlFor="quick-domain">Domain name</label><div className="quick-domain-row"><div className="domain-input"><Globe2 size={19} /><GlassInput id="quick-domain" name="domain" placeholder="example.com" value={domain} onChange={(event) => { setDomain(event.target.value); setError(""); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} required aria-describedby={error ? "quick-error" : undefined} /></div><GlassButton variant="primary" size="lg" type="submit">Generate SSL <ArrowRight /></GlassButton></div>
    <fieldset className="quick-methods"><legend className="field-label">Verification method</legend><label className={`quick-method ${wildcard || method === "dns-01" ? "selected" : ""}`}><input type="radio" name="quick-method" value="dns-01" checked={wildcard || method === "dns-01"} onChange={() => setMethod("dns-01")} /><Globe2 size={18} /><span>DNS validation</span><small>Recommended</small></label><label className={`quick-method ${!wildcard && method === "http-01" ? "selected" : ""}`}><input type="radio" name="quick-method" value="http-01" checked={!wildcard && method === "http-01"} disabled={wildcard} onChange={() => setMethod("http-01")} /><Server size={18} /><span>HTTP validation</span></label></fieldset>
    {wildcard && <p className="field-hint">Wildcard certificates require DNS validation.</p>}{error && <div id="quick-error"><ErrorMessage message={error} /></div>}
    <div className="tool-bottom"><span><ShieldCheck size={15} /> Your private key stays in your browser</span><span>No account. No credit card.</span></div>
  </form></GlassCard>;
}