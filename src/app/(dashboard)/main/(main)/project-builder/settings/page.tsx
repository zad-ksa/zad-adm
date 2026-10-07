export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/console/layout";
import { Note } from "@/components/console/ui";
import {
  listProjectBuilderPromptVersions,
  getProjectBuilderOptions,
  listProjectBuilderCharityProfiles,
} from "@/app/actions/projectBuilder";
import ProjectBuilderSettingsClient from "./ProjectBuilderSettingsClient";

export const metadata = { title: "إعدادات منشئ وثائق المبادرات | زاد التنموية" };

export default async function ProjectBuilderSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/main");

  const canManage = hasPermission(session.role, session.permissions || [], "manage_project_builder");
  if (!canManage) redirect("/main/project-builder");

  const [versions, options, profiles] = await Promise.all([
    listProjectBuilderPromptVersions(),
    getProjectBuilderOptions(),
    listProjectBuilderCharityProfiles(),
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[{ label: "منشئ وثائق المبادرات", href: "/main/project-builder" }, { label: "الإعدادات" }]}
        title="إعدادات منشئ وثائق المبادرات"
        description="البرومبت العام الذي تُصاغ به كل وثيقة، بتاريخ تعديلاته كاملاً، وقيود المحتوى ومحاور الوثيقة المعيارية، والمعلومات الثابتة لكل جمعية — كلها في قاعدة البيانات، ولا يراها ولا يعدّلها إلا من يحمل هذه الصلاحية."
      />

      {!versions.success && <Note tone="warn">تعذّر تحميل سجل البرومبت: {versions.error}</Note>}
      {!profiles.success && (
        <Note tone="warn">
          تعذّر تحميل قائمة الجمعيات: {profiles.error}. غالباً يعني هذا أن جداول الأداة لم تُنشأ بعد في قاعدة
          البيانات — شغّل <code className="font-mono">node scripts/project-builder-ddl.js --apply</code> ثم أعد
          تحميل الصفحة.
        </Note>
      )}

      <ProjectBuilderSettingsClient
        initialVersions={versions.success ? versions.versions : []}
        initialOptions={options}
        initialCharities={profiles.success ? profiles.charities : []}
      />
    </div>
  );
}
