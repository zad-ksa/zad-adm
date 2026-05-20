import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التحليل السداسي | زاد التنموية",
  description: "التحليل السداسي للجمعيات الخيرية - إعداد زاد التنموية",
};

export default function HexagonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
