export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/console/layout";
import { getProjectBuilderConfig, listProjectBuilderCharityProfiles } from "@/app/actions/projectBuilder";
import ProjectBuilderSettingsClient from "./ProjectBuilderSettingsClient";

export const metadata = { title: "إعدادات منشئ وثائق المبادرات | زاد التنموية" };

export default async function ProjectBuilderSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/main");

  const canManage = hasPermission(session.role, session.permissions || [], "manage_project_builder");
  if (!canManage) redirect("/main/project-builder");

  const [config, profiles] = await Promise.all([
    getProjectBuilderConfig(),
    listProjectBuilderCharityProfiles(),
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[{ label: "منشئ وثائق المبادرات", href: "/main/project-builder" }, { label: "الإعدادات" }]}
        title="إعدادات منشئ وثائق المبادرات"
        description="البرومبت العام الذي تُصاغ به كل وثيقة، والمعلومات الثابتة لكل جمعية — لا يراهما ولا يعدّلهما إلا من يحمل هذه الصلاحية."
      />
      <ProjectBuilderSettingsClient
        initialConfig={config}
        initialCharities={profiles.success ? profiles.charities : []}
      />
    </div>
  );
}
