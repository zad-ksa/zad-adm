import type { Metadata, Viewport } from "next";
import { Inter, Cairo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap" 
});

const cairo = Cairo({ 
  subsets: ["arabic"], 
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap" 
});

/**
 * `themeColor` paints the phone's status bar in the brand teal instead of the
 * browser's default white, which is most of what separates "a tab" from "an app"
 * at a glance. It is split by scheme so the dark theme does not get a light bar.
 *
 * Deliberately absent: `maximumScale` / `userScalable`. Pinning them is the
 * usual shortcut for stopping iOS from zooming when a field is focused, but it
 * also blocks pinch-zoom for anyone who needs it. The 16px input rule in
 * globals.css fixes the same problem without taking zoom away.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  // Safari ignores the manifest's display mode; these are what make an
  // added-to-home-screen launch open without browser chrome on iOS.
  appleWebApp: {
    capable: true,
    title: "زاد",
    // "default" keeps the web view below the status bar. "black-translucent"
    // would push content up under the clock, which every full-height screen in
    // this app would then have to compensate for.
    statusBarStyle: "default",
  },
  title: {
    template: "%s | زاد التنموية",
    default: "زاد التنموية",
  },
  description: "شركة زاد الإدارة التنموية - الشريك الاستراتيجي الموثوق لتمكين وتطوير القطاع غير الربحي",
  openGraph: {
    title: {
      template: "%s | زاد التنموية",
      default: "زاد التنموية",
    },
    description: "شركة زاد الإدارة التنموية - الشريك الاستراتيجي الموثوق لتمكين وتطوير القطاع غير الربحي",
    siteName: "زاد التنموية",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: {
      template: "%s | زاد التنموية",
      default: "زاد التنموية",
    },
    description: "شركة زاد الإدارة التنموية - الشريك الاستراتيجي الموثوق لتمكين وتطوير القطاع غير الربحي",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${cairo.variable} font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
