import {
  Cairo,
  Tajawal,
  Almarai,
  IBM_Plex_Sans_Arabic,
  Readex_Pro,
  El_Messiri,
  Reem_Kufi,
  Changa,
} from "next/font/google";
import type { LandingFontKey } from "@/lib/landing";

/**
 * خطوط الواجهة الرئيسية — عربية احترافية/إبداعية، مستضافة ذاتياً عبر next/font
 * (تُبنى وقت البناء وتُخدَم من /_next/static، فتتوافق مع `font-src 'self'` في CSP
 * دون أي طلب إلى fonts.gstatic.com).
 *
 * `preload: false` مقصود: لا يُحمَّل مسبقاً إلا ما يستخدمه الزائر فعلاً — المتصفح
 * ينزّل ملف الخط المختار فقط عند أول استخدام، لا الثمانية.
 */

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-landing-cairo",
  display: "swap",
  preload: false,
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-tajawal",
  display: "swap",
  preload: false,
});

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["400", "700", "800"],
  variable: "--font-landing-almarai",
  display: "swap",
  preload: false,
});

const ibm = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-ibm",
  display: "swap",
  preload: false,
});

const readex = Readex_Pro({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-readex",
  display: "swap",
  preload: false,
});

const messiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-landing-messiri",
  display: "swap",
  preload: false,
});

const reem = Reem_Kufi({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-reem",
  display: "swap",
  preload: false,
});

const changa = Changa({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-landing-changa",
  display: "swap",
  preload: false,
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
