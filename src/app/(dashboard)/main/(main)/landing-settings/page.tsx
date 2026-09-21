import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/console/layout";
import { isAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getLandingConfig } from "@/app/actions/landing";
import LandingSettingsClient from "./LandingSettingsClient";

export const metadata = {
  title: "التحكم في الواجهة الرئيسية | زاد التنموية",
};

export default async function LandingSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const hasPerm =
    isAdmin(session.role) ||
    session.permissions?.includes("manage_landing") ||
    session.permissions?.includes("developer_mode");

  if (!hasPerm) redirect("/main");

  const config = await getLandingConfig();

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
          crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "الواجهة الرئيسية" }]}
          title="التحكم في الواجهة الرئيسية"
          description="تحكّم في نصوص كل فقرة من الصفحة الرئيسية العامة وخلفيتها (لون / تدرّج / صورة) وتأثيرها الحركي وألوان وأحجام النص — مع معاينة حية قبل الحفظ."
      />

      <LandingSettingsClient initialConfig={config} />
    </div>
  );
}
