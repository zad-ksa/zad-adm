import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import ServicesOverviewClient from "./ServicesOverviewClient";
import { getAssignedCharityIds } from "@/lib/access";
import { getTimelineConfigs } from "@/app/actions/settings";

export const metadata: Metadata = {
  title: "عرض الخدمات | زاد التنموية",
};

const BUILTIN_DEPTS = ["STRATEGY", "GOVERNANCE", "FINANCE"];

export default async function ServicesOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/");

  let timelineNames: Record<string, string> = {};
  try { timelineNames = await getTimelineConfigs(); } catch (e) { console.error("[ServicesOverview] getTimelineConfigs error:", e); }
  const DEPT_LABELS: Record<string, string> = {
    STRATEGY: timelineNames["STRATEGY"] || "التخطيط الاستراتيجي",
    GOVERNANCE: timelineNames["GOVERNANCE"] || "الحوكمة",
    FINANCE: timelineNames["FINANCE"] || "تنمية الموارد المالية",
    PROGRAMS: "البرامج والمشاريع",
  };

  const role = session.role;
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(role);

  // Get assigned charity IDs for restricted roles (null = all access)
  const assignedIds = isAdmin ? null : await getAssignedCharityIds(session.id, role);
  const charityFilter = assignedIds !== null ? { id: { in: assignedIds } } : undefined;
  const serviceCharityFilter = assignedIds !== null ? { charityId: { in: assignedIds } } : undefined;
  const stageFilter = assignedIds !== null ? { charityId: { in: assignedIds } } : {};

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

  if (canSee("STRATEGY")) {
    data["STRATEGY"] = await prisma.strategicStage.findMany({
      where: stageFilter,
      orderBy: [{ charityId: "asc" }, { order: "asc" }],
    });
  }
  if (canSee("GOVERNANCE")) {
    try {
      data["GOVERNANCE"] = await prisma.governanceStage.findMany({
        where: stageFilter,
        orderBy: [{ charityId: "asc" }, { order: "asc" }],
      });
    } catch (e) { console.error("[ServicesOverview] governanceStage error:", e); data["GOVERNANCE"] = []; }
  }
  if (canSee("FINANCE")) {
    data["FINANCE"] = await prisma.financeStage.findMany({
      where: stageFilter,
      orderBy: [{ charityId: "asc" }, { order: "asc" }],
    });
  }

  // Generic (custom) services
  const isSpecialDept = BUILTIN_DEPTS.includes(role);
  if (isAdmin) {
    data["SERVICES"] = await prisma.service.findMany({
      where: serviceCharityFilter,
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { charityId: "asc" },
    });
  } else if (!isSpecialDept) {
    data["SERVICES"] = await prisma.service.findMany({
      where: { department: role, ...(assignedIds !== null ? { charityId: { in: assignedIds } } : {}) },
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { charityId: "asc" },
    });
  }

  const canEdit = isAdmin || ["STRATEGY", "GOVERNANCE", "FINANCE"].includes(role) || (!["ADMIN","EXECUTIVE_DIRECTOR","GENERAL_MANAGER","ADMINISTRATIVE_SECRETARIAT","STRATEGY","GOVERNANCE","FINANCE"].includes(role));

  return (
    <ServicesOverviewClient
      charities={charities}
      stagesData={data}
      isAdmin={isAdmin}
      canEdit={canEdit}
      role={role}
      deptLabels={DEPT_LABELS}
    />
  );
}
