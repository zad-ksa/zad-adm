import { Metadata } from "next";
import { redirect } from "next/navigation";
import LandingView from "@/components/landing/LandingView";
import { getLandingConfig } from "@/app/actions/landing";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "زاد التنموية",
  description: "الشريك الاستراتيجي الموثوق لتمكين وتطوير القطاع غير الربحي",
};

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.userType === "CHARITY_USER") {
      redirect("/select-charity");
    } else {
      redirect("/main");
    }
  }

  // المحتوى والمظهر يُقرآن من إعداد «التحكم في الواجهة الرئيسية» (GlobalSetting)،
  // وتُعاد القيم الافتراضية عند غياب أي إعداد. انظر src/lib/landing.ts.
  const landingConfig = await getLandingConfig();
  return <LandingView config={landingConfig} />;
}
