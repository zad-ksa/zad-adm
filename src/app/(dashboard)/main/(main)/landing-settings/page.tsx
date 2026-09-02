import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
      <div className="flex items-start gap-4">
        <Link
          href="/main/admin"
          className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-primary rounded-xl transition-colors mt-0.5 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">التحكم في الواجهة الرئيسية</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            تحكّم في نصوص كل فقرة من الصفحة الرئيسية العامة وخلفيتها (لون / تدرّج / صورة)
            وتأثيرها الحركي وألوان وأحجام النص — مع معاينة حية قبل الحفظ.
          </p>
        </div>
      </div>

      <LandingSettingsClient initialConfig={config} />
    </div>
  );
}
