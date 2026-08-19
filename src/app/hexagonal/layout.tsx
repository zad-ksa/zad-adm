import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التحليل السداسي | زاد التنموية",
  description: "التحليل السداسي للجمعيات الأهلية - إعداد زاد التنموية",
  openGraph: {
    title: "التحليل السداسي | زاد التنموية",
    description: "التحليل السداسي للجمعيات الأهلية - إعداد زاد التنموية",
    siteName: "زاد التنموية",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "التحليل السداسي | زاد التنموية",
    description: "التحليل السداسي للجمعيات الأهلية - إعداد زاد التنموية",
  },
};

export default function HexagonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
