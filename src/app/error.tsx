"use client";

import { TriangleAlert, RotateCcw } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="container page-shell empty-state"><TriangleAlert size={38} /><h1>This page could not load.</h1><p>Please try again. Certificate keys cannot be recovered after a page reset.</p><GlassButton variant="primary" onClick={reset}><RotateCcw /> Try again</GlassButton></div>;
}