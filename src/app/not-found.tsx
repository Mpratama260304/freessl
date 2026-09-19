import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

export default function NotFound() {
  return <div className="container page-shell empty-state"><Search size={38} /><span className="eyebrow">404 / Page not found</span><h1>This connection leads nowhere.</h1><p>The page may have moved. Your next certificate is still a click away.</p><GlassButton asChild variant="primary"><Link href="/"><ArrowLeft /> Back to home</Link></GlassButton></div>;
}