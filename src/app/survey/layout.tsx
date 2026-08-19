import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "استبيان الجاهزية | زاد التنموية",
  description: "استبيان الجاهزية لأثر مستدام - إعداد زاد التنموية",
  openGraph: {
    title: "استبيان الجاهزية | زاد التنموية",
    description: "استبيان الجاهزية لأثر مستدام - إعداد زاد التنموية",
    siteName: "زاد التنموية",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "استبيان الجاهزية | زاد التنموية",
    description: "استبيان الجاهزية لأثر مستدام - إعداد زاد التنموية",
  },
};

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
