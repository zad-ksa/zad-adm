import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الاستبيانات المخصصة | زاد التنموية",
  description: "الاستبيانات المخصصة للجمعيات الأهلية - إعداد زاد التنموية",
  openGraph: {
    title: "الاستبيانات المخصصة | زاد التنموية",
    description: "الاستبيانات المخصصة للجمعيات الأهلية - إعداد زاد التنموية",
    siteName: "زاد التنموية",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الاستبيانات المخصصة | زاد التنموية",
    description: "الاستبيانات المخصصة للجمعيات الأهلية - إعداد زاد التنموية",
  },
};

export default function CustomSurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
