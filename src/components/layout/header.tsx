"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Sun, Moon, Menu, ArrowUpRight, Check } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { site } from "@/config/site";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSheet, GlassSheetTrigger, GlassSheetContent, GlassSheetHeader, GlassSheetTitle, GlassSheetDescription } from "@/components/glass-sheet";

const links = [["Generate SSL", "/generate"], ["SSL Checker", "/ssl-checker"], ["Security Check", "/security-check"], ["Guides", "/guides"], ["FAQ", "/faq"]];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand" aria-label={`${site.name} home`}><Image src={site.logo.image} alt="" width={site.logo.width} height={site.logo.height} unoptimized /><span>{site.name}<span className="brand-dot">.</span></span></Link>
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
    <div className="header-actions"><DropdownMenu.Root><DropdownMenu.Trigger asChild><GlassButton variant="ghost" size="icon" aria-label="Choose color theme"><Sun className="theme-light-icon" /><Moon className="theme-dark-icon" /></GlassButton></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="menu-content" align="end" sideOffset={8} aria-label="Color theme">{([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]] as const).map(([value, label, Icon]) => <DropdownMenu.Item className="menu-item" key={value} onSelect={() => setTheme(value)}><Icon size={17} /><span>{label}</span>{theme === value && <Check size={16} />}</DropdownMenu.Item>)}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
      <GlassButton asChild variant="primary" className="header-cta"><Link href="/generate">Generate SSL <ArrowUpRight /></Link></GlassButton>
      <GlassSheet open={open} onOpenChange={setOpen}><GlassSheetTrigger asChild><GlassButton variant="ghost" size="icon" className="mobile-menu-trigger" aria-label="Open navigation"><Menu /></GlassButton></GlassSheetTrigger><GlassSheetContent className="navigation-sheet"><GlassSheetHeader><GlassSheetTitle className="sheet-heading">{site.name}</GlassSheetTitle><GlassSheetDescription className="text-muted">Certificates, without the friction.</GlassSheetDescription></GlassSheetHeader><nav aria-label="Mobile navigation" className="mobile-nav">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}>{label}<ArrowUpRight size={18} /></Link>)}</nav></GlassSheetContent></GlassSheet>
    </div>
  </div></header>;
}