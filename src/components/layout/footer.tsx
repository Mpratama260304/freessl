import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";

export function Footer() {
  return <footer className="site-footer"><div className="container"><div className="footer-grid"><div className="footer-brand"><Link href="/" className="brand"><ShieldCheck size={28} /><span>{site.name}.</span></Link><p>A more secure web.<br />Open to everyone.</p></div>{[["Product", ["Generate SSL", "/generate"], ["SSL Checker", "/ssl-checker"], ["Security Check", "/security-check"]], ["Resources", ["Installation guides", "/guides"], ["Frequently asked questions", "/faq"]], ["Legal", ["Privacy", "/privacy"], ["Terms", "/terms"]]].map(([title, ...items]) => <div key={String(title)}><h3>{title}</h3>{(items as string[][]).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>)}</div><div className="footer-bottom"><span>&copy; {new Date().getFullYear()} {site.name}</span><span>Certificates issued through <a href="https://letsencrypt.org" target="_blank" rel="noreferrer">Let&apos;s Encrypt <ArrowUpRight size={12} /></a>. Independently operated.</span></div></div></footer>;
}