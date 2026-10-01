import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

// ---------------------------------------------------------------------------
// Build-time environment check (review finding P1-28).
// NEXT_PUBLIC_* values are inlined into the bundle when it is built. An empty
// one used to build fine and then throw in every browser. Now the build stops
// with a message that says what to set. Server-only variables are checked at
// run time by /api/health (src/app/api/health/_lib/env.ts).
// ---------------------------------------------------------------------------
const REQUIRED_AT_BUILD = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

function checkBuildEnv(phase: string): void {
  const missing = REQUIRED_AT_BUILD.filter((name) => !process.env[name]?.trim());
  if (missing.length === 0) return;
  const message =
    `[env] Missing ${missing.join(", ")}. These are inlined at build time: ` +
    "set them in .env.local (local) or .env next to docker-compose.yml (droplet), then build again. " +
    "See .env.example.";
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) {
    throw new Error(message);
  }
  console.warn(message);
}

// ---------------------------------------------------------------------------
// Security headers (review finding P1-6).
//
// Enforced on every response:
//   - HSTS: browsers only honour it over HTTPS, so the plain-HTTP review
//     port is unaffected. No `preload` (that is a one-way door).
//   - nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
//   - A small Content-Security-Policy that cannot break rendering:
//     frame-ancestors / base-uri / object-src only.
//
// The full policy ships as Content-Security-Policy-Report-Only first. It has
// not been exercised in a browser yet: open the app with the console open,
// walk the funnel, sign in with Google and email, open a lab with an evidence
// upload, and if nothing is reported move FULL_CSP into the enforced header.
//
// Notes on the full policy:
//   - script-src needs 'unsafe-inline': the App Router inlines its bootstrap
//     and flight data, and a nonce-based policy would force every page to
//     render dynamically (see the CSP guide in node_modules/next/dist/docs).
//     'unsafe-eval' is added in development only (React's debugging aids).
//   - connect-src / img-src list the Supabase project (REST, auth, storage
//     signed URLs, and realtime over wss).
//   - Google and Kakao sign-in are top-level navigations through Supabase,
//     which CSP does not restrict; no Google origin is needed.
//   - No upgrade-insecure-requests: it would break the HTTP review port.
// ---------------------------------------------------------------------------
function supabaseSources(): { http: string; ws: string } {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { http: url.origin, ws: `${url.protocol === "http:" ? "ws" : "wss"}://${url.host}` };
  } catch {
    return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  }
}

function securityHeaders(isDev: boolean) {
  const supabase = supabaseSources();

  const baseCsp = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"];
  const fullCsp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase.http}`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabase.http} ${supabase.ws}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    ...baseCsp,
  ];

  return [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), " +
        "accelerometer=(), gyroscope=(), magnetometer=(), browsing-topics=()",
    },
    { key: "Content-Security-Policy", value: baseCsp.join("; ") },
    { key: "Content-Security-Policy-Report-Only", value: fullCsp.join("; ") },
  ];
}

export default function config(phase: string): NextConfig {
  checkBuildEnv(phase);
  const isDev = process.env.NODE_ENV === "development";

  return {
    // Standalone output for the DigitalOcean droplet (Docker behind Caddy).
    output: "standalone",
    // Do not advertise the framework.
    poweredByHeader: false,
    // Track fact sheets are read at runtime by the one-pager route; make sure
    // the standalone build bundles them.
    outputFileTracingIncludes: {
      "/api/one-pager": ["./content/tracks/**/*"],
    },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders(isDev) }];
    },
  };
}
