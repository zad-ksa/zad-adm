import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التحليل السداسي للجمعيات الخيرية",
  description: "التحليل السداسي للجمعيات الخيرية - إعداد زاد التنموية",
};

export default function HexagonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
