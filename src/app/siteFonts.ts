import localFont from "next/font/local";

/**
 * خطوط الموقع من ملفّاتٍ في المستودع (src/app/fonts) لا من Google.
 *
 * بناءُ Vercel صار يفشل على خطوط next/font/google واحداً بعد واحد —
 * ("next/font/google queries have exactly one entry"): الرابطُ الذي يعطيه
 * Google لبيئة البناء هناك لا يقرؤه Turbopack، والبناءُ نفسُه ينجح محلياً.
 * فلا يتّصل البناءُ بـGoogle أصلاً: الملفّاتُ نُزّلت من مستودع Google Fonts
 * الرسمي، وقُصَّت على العربية واللاتينية، وضُغطت woff2. والرخصُ (OFL) في
 * fonts/OFL-LICENSES.txt.
 *
 * والنسخةُ الواحدة تُشارَك: كانت صفحاتُ الدخول تنادي Cairo بأوزانٍ خاصة،
 * والملفُّ هنا متغيّرُ الوزن يغطّي ٢٠٠–١٠٠٠ فلا حاجة لنسخةٍ لكل صفحة.
 */

export const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const cairo = localFont({
  src: "./fonts/Cairo-Variable.woff2",
  weight: "200 1000",
  variable: "--font-cairo",
  display: "swap",
});

export const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
});

export const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});
