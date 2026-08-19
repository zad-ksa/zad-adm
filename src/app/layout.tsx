import type { Metadata } from "next";
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

export const metadata: Metadata = {
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
