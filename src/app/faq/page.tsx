import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { faqs } from "@/config/faq";
import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata("Frequently Asked Questions", "Answers about free SSL certificates, DNS validation, wildcard coverage, private keys and renewal.", "/faq");
export default function FaqPage() {
  return <div className="container page-shell narrow-page"><div className="page-heading"><span className="eyebrow">A little clarity goes a long way</span><h1>Questions, answered.</h1><p>The practical details behind your certificate, your keys, and your next secure connection.</p></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div><Link className="text-link" href="/generate">Ready to generate your certificate? <ArrowRight size={17} /></Link></div>;
}