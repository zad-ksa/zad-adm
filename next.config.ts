import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Baseline, pragmatic CSP — 'unsafe-inline' is kept for script/style-src because
// Next.js's own hydration scripts and Tailwind's runtime style injection are not
// nonce-tagged in this setup; a stricter nonce-based CSP would need to be wired
// through proxy.ts + the root layout and verified in a real browser before
// shipping (risk: a wrong strict CSP can silently break hydration site-wide).
// This baseline still blocks framing, external script/object injection, and
// restricts network/asset origins to what the app actually uses.
// مضيفا التخزين الجديد، يُقرآن من البيئة لا يُكتبان في الكود.
//
// ومضيفان لا واحد: القراءةُ من النطاق الخاصِّ أمام Cloudflare (وهو ما يُحفظ
// في القاعدة)، والرفعُ إلى نقطةِ نهاية S3 — فالرابطُ المُوقَّع يشمل المضيفَ
// ولا يصحّ على غيره. ومن نسي أحدَهما في السياسة انحجب عنه كلُّ ملفٍّ أو
// انقطع كلُّ رفعٍ عند المتصفِّح بلا شيءٍ في سجلّ الشبكة إلّا «blocked».
//
// وCloudinary باقيةٌ هنا ما بقي فيها ملفٌّ واحد: المزوّدان يتعايشان حتى
// يُرحَّل آخرُ ملفٍّ ويُتحقَّق منه، ثمّ يُحذف سطرُها من هنا.
const originOf = (value?: string) => {
  try {
    return value?.trim() ? new URL(value).origin : null;
  } catch {
    return null;
  }
};
const STORAGE_READ_ORIGIN = originOf(process.env.STORAGE_PUBLIC_BASE);
const STORAGE_WRITE_ORIGIN = originOf(process.env.B2_ENDPOINT);
const withOrigins = (base: string, ...origins: (string | null)[]) =>
  [base, ...origins.filter(Boolean)].join(" ");
const cspParts = (frameAncestors: string) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  withOrigins("img-src 'self' data: blob: https://res.cloudinary.com", STORAGE_READ_ORIGIN),
  "font-src 'self' data:",
  // api.cloudinary.com is the UPLOAD host and is a different origin from the
  // res.cloudinary.com that serves files back. Design-request attachments go
  // straight from the browser to Cloudinary — the serverless request body limit
  // makes anything larger than a few MB impossible through our own API — and
  // without this entry the browser blocks that upload before it leaves.
  withOrigins(
    "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com",
    STORAGE_READ_ORIGIN,
    STORAGE_WRITE_ORIGIN
  ),
  frameAncestors,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const CSP = cspParts("frame-ancestors 'none'");

// /landing-preview is rendered inside a same-origin <iframe> by the landing-page
// editor at /main/landing-settings. X-Frame-Options: DENY blocks even same-origin
// framing, so that one route relaxes to SAMEORIGIN / frame-ancestors 'self'.
const CSP_SAMEORIGIN_FRAME = cspParts("frame-ancestors 'self'");

const commonSecurityHeaders = [
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  ...commonSecurityHeaders,
];

const previewSecurityHeaders = [
  { key: "Content-Security-Policy", value: CSP_SAMEORIGIN_FRAME },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ...commonSecurityHeaders,
];

const nextConfig: NextConfig = {
  // مجلّد البناء. `next build` و`next dev` يكتبان في `.next` نفسه، فبناءٌ
  // للتحقق أثناء عمل خادم التطوير يمسح تحته ملفّات التوجيه فتصير كل صفحة 404
  // حتى يُعاد تشغيله. وبهذا المتغيّر يبني المتحقِّق في مجلّدٍ آخر:
  //   NEXT_BUILD_DIR=.next-verify npx next build
  distDir: process.env.NEXT_BUILD_DIR || ".next",
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
    // ومن أضاف مضيفاً هنا فليُضفه في img-src أيضاً: هذه تُجيز لمُحسِّن الصور
    // أن يجلبها، وتلك تُجيز للمتصفِّح أن يعرضها. ونقصُ أيٍّ منهما يكسر الصورةَ
    // بعطبٍ مختلف — 400 من /_next/image هنا، وحجبٌ صامتٌ هناك.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      ...(STORAGE_READ_ORIGIN
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(STORAGE_READ_ORIGIN).hostname,
              port: "",
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
  // المسار القديم /main/knowledge-tree صار /main/template-library. من حفظ
  // الرابط أو تركه في تبويب مفتوح يصل الصفحة بدل 404.
  async redirects() {
    return [
      { source: "/main/knowledge-tree", destination: "/main/template-library", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // كل المسارات عدا معاينة الواجهة الرئيسية الداخلية.
        source: "/((?!landing-preview).*)",
        headers: securityHeaders,
      },
      {
        source: "/landing-preview",
        headers: previewSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
