import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import ServicesOverviewClient from "./ServicesOverviewClient";
import { getAssignedCharityIds } from "@/lib/access";
import { getTimelineConfigs } from "@/app/actions/settings";
import { hasPermission, isAdmin as isUserAdmin } from "@/lib/permissions";

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

  const role = session.role;
  const isAdmin = isUserAdmin(role) || session.permissions?.includes("developer_mode");

  // The timeline labels have nothing to do with which charities this user may
  // see, so the two go out together instead of one after the other.
  const [timelineNames, assignedIds] = await Promise.all([
    getTimelineConfigs().catch((e) => {
      console.error("[ServicesOverview] getTimelineConfigs error:", e);
      return {} as Record<string, string>;
    }),
    isAdmin ? Promise.resolve(null) : getAssignedCharityIds(session.id, role, session.permissions),
  ]);

  const DEPT_LABELS: Record<string, string> = {
    STRATEGY: timelineNames["STRATEGY"] || "التخطيط الاستراتيجي",
    GOVERNANCE: timelineNames["GOVERNANCE"] || "الحوكمة",
    FINANCE: timelineNames["FINANCE"] || "تنمية الموارد المالية",
    PROGRAMS: "البرامج والمشاريع",
  };

  const charityFilter = assignedIds !== null ? { id: { in: assignedIds } } : undefined;
  const serviceCharityFilter = assignedIds !== null ? { charityId: { in: assignedIds } } : undefined;

  // The two branches this replaced built the same filter by different routes —
  // an admin has assignedIds === null, so serviceCharityFilter is undefined for
  // them either way. All that actually differed was whether to run the query.
  const wantsServices = isAdmin || !BUILTIN_DEPTS.includes(role);

  const [charities, services] = await Promise.all([
    prisma.charity.findMany({
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
    }),
    wantsServices
      ? prisma.service.findMany({
          where: { ...serviceCharityFilter },
          include: { stages: { orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } } },
          orderBy: { charityId: "asc" },
        })
      : Promise.resolve(null),
  ]);

  const data: Record<string, any[]> = {};
  if (services) data["SERVICES"] = services;

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
