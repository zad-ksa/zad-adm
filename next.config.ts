import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Baseline, pragmatic CSP — 'unsafe-inline' is kept for script/style-src because
// Next.js's own hydration scripts and Tailwind's runtime style injection are not
// nonce-tagged in this setup; a stricter nonce-based CSP would need to be wired
// through proxy.ts + the root layout and verified in a real browser before
// shipping (risk: a wrong strict CSP can silently break hydration site-wide).
// This baseline still blocks framing, external script/object injection, and
// restricts network/asset origins to what the app actually uses.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  // api.cloudinary.com is the UPLOAD host and is a different origin from the
  // res.cloudinary.com that serves files back. Design-request attachments go
  // straight from the browser to Cloudinary — the serverless request body limit
  // makes anything larger than a few MB impossible through our own API — and
  // without this entry the browser blocks that upload before it leaves.
  "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation=(self) — the attendance check-in reads navigator.geolocation.
  // An empty allowlist here makes getCurrentPosition fail with a permission
  // error in Chrome *before the user is ever prompted*, which looks exactly
  // like a denied permission and is very hard to diagnose. Camera and
  // microphone stay fully disabled; nothing in the app uses them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  // HSTS only makes sense over HTTPS (Vercel serves production over HTTPS by default).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Client-side router cache. Without this, `dynamic` defaults to 0 — every
    // page segment is refetched from ap-southeast-2 on every visit, so leaving
    // a tab and coming straight back paid a full round trip for data that was
    // seconds old. All 46 dashboard routes are dynamic, so none were ever reused.
    //
    // 30s is deliberately short, and mutations do not depend on it: the server
    // actions call revalidatePath, which invalidates this cache immediately.
    // It only covers plain back-and-forth navigation.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
