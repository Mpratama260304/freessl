import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["acme-client", "ioredis", "pino"],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ...(process.env.SITE_URL?.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ] }];
  },
};

export default nextConfig;