"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { Tooltip } from "radix-ui";

function Notifications() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} richColors closeButton position="bottom-right" />;
}

export function Providers({ children, nonce }: { children: React.ReactNode; nonce: string }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce} disableTransitionOnChange><Tooltip.Provider delayDuration={250}>{children}<Notifications /></Tooltip.Provider></ThemeProvider>;
}