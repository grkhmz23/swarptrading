import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const REQUIRED_IN_PRODUCTION = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SOLANA_NETWORK"] as const;

function assertProductionEnv(): void {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for a production build: ${missing.join(", ")}. ` +
        "See apps/foundation-dashboard/.env.example."
    );
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;
  if (!/^https:\/\//.test(apiUrl)) {
    throw new Error(`NEXT_PUBLIC_API_URL must be an https:// URL in production builds (got "${apiUrl}").`);
  }
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(isDev: boolean): string {
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL) ?? "http://localhost:3001";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js injects inline bootstrap scripts; no third-party script hosts are allowed.
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Token logos come from arbitrary hosts (Jupiter token list, launchpad uploads).
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", apiOrigin, ...(isDev ? ["ws:", "http://localhost:*"] : [])],
    // Veriff verification iframe and DexScreener chart embeds.
    "frame-src": ["https://*.veriff.me", "https://*.veriff.com", "https://dexscreener.com"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export default function config(phase: string): NextConfig {
  const isProductionBuild = phase === PHASE_PRODUCTION_BUILD;
  if (isProductionBuild) assertProductionEnv();
  const isDev = process.env.NODE_ENV !== "production";

  return {
    poweredByHeader: false,
    reactStrictMode: true,
    // Strip console.log/info/debug from production bundles; errors and warnings stay.
    compiler: { removeConsole: isDev ? false : { exclude: ["error", "warn"] } },
    turbopack: {
      root: process.cwd(),
    },
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "swarppay-images-prod.s3.us-east-2.amazonaws.com",
          port: "",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "swarpfoundation.com",
          port: "",
          pathname: "/**",
        },
      ],
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            // camera is left at its default so the Veriff iframe can request it via allow="camera".
            { key: "Permissions-Policy", value: "geolocation=(), payment=(), usb=()" },
            { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
            { key: "X-Robots-Tag", value: "noindex, nofollow" },
          ],
        },
      ];
    },
  };
}
