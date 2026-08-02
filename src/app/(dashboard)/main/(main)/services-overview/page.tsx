import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import ServicesOverviewClient from "./ServicesOverviewClient";
import { getAssignedCharityIds } from "@/lib/access";
import { getTimelineConfigs } from "@/app/actions/settings";
import { hasPermission, AUTO_ADMIN_ROLES } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "عرض الخدمات | زاد التنموية",
};

const BUILTIN_DEPTS = ["STRATEGY", "GOVERNANCE", "FINANCE"];

export default async function ServicesOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/");

  if (!hasPermission(session.role, session.permissions || [], "view_services_overview")) {
    redirect("/main");
  }

  let timelineNames: Record<string, string> = {};
  try { timelineNames = await getTimelineConfigs(); } catch (e) { console.error("[ServicesOverview] getTimelineConfigs error:", e); }
  const DEPT_LABELS: Record<string, string> = {
    STRATEGY: timelineNames["STRATEGY"] || "التخطيط الاستراتيجي",
    GOVERNANCE: timelineNames["GOVERNANCE"] || "الحوكمة",
    FINANCE: timelineNames["FINANCE"] || "تنمية الموارد المالية",
    PROGRAMS: "البرامج والمشاريع",
  };

  const role = session.role;
  const isAdmin = AUTO_ADMIN_ROLES.includes(role) || session.permissions?.includes("developer_mode");

  const assignedIds = isAdmin ? null : await getAssignedCharityIds(session.id, role, session.permissions);
  const charityFilter = assignedIds !== null ? { id: { in: assignedIds } } : undefined;
  const serviceCharityFilter = assignedIds !== null ? { charityId: { in: assignedIds } } : undefined;

  const charities = await prisma.charity.findMany({
    where: charityFilter,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      strategyTimelineName: true,
      governanceTimelineName: true,
      financeTimelineName: true,
    },
  });

  const data: Record<string, any[]> = {};
  const canSee = (dept: string) => isAdmin || role === dept;

  const mapStages = (stages: any[]) => stages.map(s => ({
    ...s,
    charityId: s.service.charityId
  }));



  // Generic (custom) services
  const isSpecialDept = BUILTIN_DEPTS.includes(role);
  if (isAdmin) {
    data["SERVICES"] = await prisma.service.findMany({
      where: { ...serviceCharityFilter },
      include: { stages: { orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } } },
      orderBy: { charityId: "asc" },
    });
  } else if (!isSpecialDept) {
    data["SERVICES"] = await prisma.service.findMany({
      where: {
        ...(assignedIds !== null ? { charityId: { in: assignedIds } } : {})
      },
      include: { stages: { orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } } },
      orderBy: { charityId: "asc" },
    });
  }

  const editableTabs = {
    STRATEGY: isAdmin || hasPermission(session.role, session.permissions || [], "manage_strategy") || role === "STRATEGY",
    GOVERNANCE: isAdmin || hasPermission(session.role, session.permissions || [], "manage_governance") || role === "GOVERNANCE",
    FINANCE: isAdmin || hasPermission(session.role, session.permissions || [], "manage_finance") || role === "FINANCE",
    SERVICES: isAdmin || hasPermission(session.role, session.permissions || [], "manage_programs") || role === "PROGRAMS",
  };

  return (
    <ServicesOverviewClient
      charities={charities}
      stagesData={data}
      isAdmin={isAdmin}
      editableTabs={editableTabs}
      role={role}
      deptLabels={DEPT_LABELS}
      allowedCharityIds={assignedIds}
    />
  );
}
