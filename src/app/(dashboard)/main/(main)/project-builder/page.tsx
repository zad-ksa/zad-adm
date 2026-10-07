export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/console/layout";
import { btn } from "@/components/console/ui";
import ProjectBuilderClient from "./ProjectBuilderClient";

export const metadata = { title: "منشئ وثائق المبادرات | زاد التنموية" };

export default async function ProjectBuilderPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/main");

  const canUse = hasPermission(session.role, session.permissions || [], "use_project_builder");
  if (!canUse) redirect("/main");

  const canManage = hasPermission(session.role, session.permissions || [], "manage_project_builder");

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="منشئ وثائق المبادرات"
        description="صياغة وثيقة مبادرة احترافية بالذكاء الاصطناعي، مبنيّة على بيانات الجمعية المعتمدة في الأداة."
        actions={
          canManage ? (
            <Link href="/main/project-builder/settings" className={btn.secondary}>
              <Settings className="size-4" /> إعدادات الأداة
            </Link>
          ) : undefined
        }
      />
      <ProjectBuilderClient />
    </div>
  );
}
