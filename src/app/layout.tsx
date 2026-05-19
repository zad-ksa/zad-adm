import type { Metadata } from "next";
import { Inter, Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";

const notoKufi = Noto_Kufi_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "استبيان الجاهزية | زاد التنموية",
  description: "استبيان الجاهزية لأثر مستدام - إعداد زاد التنموية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${notoKufi.className} bg-slate-50 text-slate-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
