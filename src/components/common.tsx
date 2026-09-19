"use client";

import { useState } from "react";
import { Check, Copy, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { GlassButton } from "./ui/glass-button";
import { Tooltip } from "radix-ui";

export function CopyButton({ value, label = "Copy value" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); toast.success("Copied to clipboard"); }
    catch { toast.error("Clipboard unavailable. Select and copy the value manually."); }
  }
  return <Tooltip.Root><Tooltip.Trigger asChild><GlassButton type="button" variant="ghost" size="icon" aria-label={label} onClick={copy} onBlur={() => setCopied(false)}>{copied ? <Check /> : <Copy />}</GlassButton></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={6}>{copied ? "Copied!" : label}<Tooltip.Arrow className="tooltip-arrow" /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}

export function TechnicalValue({ label, value }: { label: string; value: string }) {
  return <div className="technical-value"><div className="technical-content"><span className="field-label">{label}</span><code>{value}</code></div><CopyButton value={value} label={`Copy ${label.toLowerCase()}`} /></div>;
}

export function ErrorMessage({ message }: { message: string }) {
  return <div className="notice notice-error" role="alert"><AlertCircle size={19} /><p>{message}</p></div>;
}

export function downloadFile(name: string, content: string | Uint8Array) {
  const blob = new Blob([typeof content === "string" ? content : new Uint8Array(content)], { type: typeof content === "string" ? "text/plain;charset=utf-8" : "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CodeBlock({ code, label = "Configuration" }: { code: string; label?: string }) {
  return <div className="code-block"><div className="code-header"><span>{label}</span><CopyButton value={code} label="Copy configuration" /></div><pre tabIndex={0}><code>{code}</code></pre></div>;
}

export function DownloadButton({ name, content }: { name: string; content: string }) {
  return <GlassButton type="button" onClick={() => downloadFile(name, content)}><Download /> Download</GlassButton>;
}