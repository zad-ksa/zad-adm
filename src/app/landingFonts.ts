import localFont from "next/font/local";
import type { LandingFontKey } from "@/lib/landing";

/**
 * خطوط الواجهة الرئيسية — عربية احترافية/إبداعية، مستضافة ذاتياً عبر next/font
 * (تُخدَم من /_next/static، فتتوافق مع `font-src 'self'` في CSP).
 *
 * من ملفّاتٍ في src/app/fonts لا من Google: بناءُ Vercel صار يفشل على خطوط
 * next/font/google واحداً بعد واحد — انظر siteFonts.ts. والمتغيّرُ الوزن ملفٌّ
 * واحد، والثابتُ ملفٌّ لكل وزن.
 *
 * `preload: false` مقصود: لا يُحمَّل مسبقاً إلا ما يستخدمه الزائر فعلاً — المتصفح
 * ينزّل ملف الخط المختار فقط عند أول استخدام، لا الثمانية.
 */

const cairo = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/Cairo-Variable.woff2",
  weight: "200 1000",
  variable: "--font-landing-cairo",
});

const tajawal = localFont({
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/Tajawal-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Tajawal-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Tajawal-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-landing-tajawal",
});

const almarai = localFont({
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/Almarai-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Almarai-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Almarai-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-landing-almarai",
});

const ibm = localFont({
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/IBMPlexSansArabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSansArabic-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexSansArabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-landing-ibm",
});

const readex = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/ReadexPro-Variable.woff2",
  weight: "160 700",
  variable: "--font-landing-readex",
});

const messiri = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/ElMessiri-Variable.woff2",
  weight: "400 700",
  variable: "--font-landing-messiri",
});

const reem = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/ReemKufi-Variable.woff2",
  weight: "400 700",
  variable: "--font-landing-reem",
});

const changa = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/Changa-Variable.woff2",
  weight: "200 800",
  variable: "--font-landing-changa",
});

/** يُوضع على غلاف LandingView ليُتيح كل متغيّرات `--font-landing-*`. */
export const LANDING_FONT_VARS_CLASSNAME = [
  cairo.variable,
  tajawal.variable,
  almarai.variable,
  ibm.variable,
  readex.variable,
  messiri.variable,
  reem.variable,
  changa.variable,
].join(" ");

const STACKS: Record<LandingFontKey, string> = {
  cairo: "var(--font-landing-cairo), var(--font-cairo), sans-serif",
  tajawal: "var(--font-landing-tajawal), sans-serif",
  almarai: "var(--font-landing-almarai), sans-serif",
  ibm: "var(--font-landing-ibm), sans-serif",
  readex: "var(--font-landing-readex), sans-serif",
  messiri: "var(--font-landing-messiri), serif",
  reem: "var(--font-landing-reem), sans-serif",
  changa: "var(--font-landing-changa), sans-serif",
};

export function landingFontStack(key: LandingFontKey): string {
  return STACKS[key] ?? STACKS.cairo;
}
