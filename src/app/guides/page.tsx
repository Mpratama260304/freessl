import Link from "next/link";
import { ArrowUpRight, BookOpen, Box, Code2, Layers, LayoutPanelTop, Server, Terminal, Waypoints } from "lucide-react";
import { guides } from "@/config/guides";
import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata("SSL Installation Guides", "Install Let's Encrypt certificates on Nginx, Apache, cPanel, HestiaCP, CloudPanel, Node.js and Docker.", "/guides");
const icons = [Server, Terminal, LayoutPanelTop, Layers, Waypoints, Code2, Box];

export default function GuidesPage() {
  return <div className="container page-shell"><div className="page-heading"><span className="eyebrow">From download to deployment</span><h1>Make your certificate feel at home.</h1><p>Practical installation steps for the servers, panels, and tools you already use.</p></div><div className="guide-grid">{guides.map((guide, index) => { const Icon = icons[index]; return <Link key={guide.slug} href={`/guides/${guide.slug}`} className="guide-card"><div className={`benefit-icon accent-${index % 3}`}><Icon size={23} /></div><span className="guide-category">{guide.category}</span><h2>{guide.name}</h2><p>{guide.description}</p><span className="text-link">Read guide <ArrowUpRight size={17} /></span></Link>; })}</div><div className="notice notice-info"><BookOpen size={20} /><p>Use production certificates for live sites. Test configurations before reloading, and set a renewal reminder based on your certificate&apos;s actual expiry date.</p></div></div>;
}