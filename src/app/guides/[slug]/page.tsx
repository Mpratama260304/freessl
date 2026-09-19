import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { guides } from "@/config/guides";
import { pageMetadata } from "@/config/site";
import { CodeBlock } from "@/components/common";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  return guide ? pageMetadata(`${guide.name} SSL Installation`, guide.description, `/guides/${slug}`) : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) notFound();
  return <div className="container page-shell"><Link href="/guides" className="text-link"><ArrowLeft size={16} /> All guides</Link><div className="docs-layout"><aside className="docs-sidebar"><h2>Installation guides</h2><nav aria-label="Installation platforms">{guides.map((item) => <Link key={item.slug} href={`/guides/${item.slug}`} aria-current={slug === item.slug ? "page" : undefined}>{item.name}<ArrowRight size={14} /></Link>)}</nav></aside><article className="guide-article"><div className="page-heading"><span className="eyebrow">{guide.category} / Installation</span><h1>Install SSL on {guide.name}.</h1><p>{guide.description}</p></div><div className="notice notice-warning"><ShieldCheck size={19} /><p>Before you begin: use an issued production certificate and its matching private key. Back up the current configuration. Staging certificates are not publicly trusted.</p></div>{guide.steps.map((step, index) => <section className="guide-step" key={step.title}><h2><span>{index + 1}</span>{step.title}</h2><p>{step.text}</p>{step.code && <CodeBlock code={step.code} label={step.title} />}</section>)}<div className="guide-finish"><h2>Confirm the connection.</h2><p>Check the installed certificate and chain, then keep an eye on the expiry date.</p><Link href="/ssl-checker" className="text-link">Open SSL Checker <ArrowRight size={16} /></Link></div></article></div></div>;
}