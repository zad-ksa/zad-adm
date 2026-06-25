import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import ServicesOverviewClient from "./ServicesOverviewClient";

export const metadata: Metadata = {
  title: "عرض الخدمات | زاد التنموية",
};

const DEPT_LABELS: Record<string, string> = {
  STRATEGY: "التخطيط الاستراتيجي",
  GOVERNANCE: "الحوكمة",
  FINANCE: "المالية",
  PROGRAMS: "البرامج والمشاريع",
};

const BUILTIN_DEPTS = ["STRATEGY", "GOVERNANCE", "FINANCE"];

export default async function ServicesOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role;
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(role);

  const charities = await prisma.charity.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      strategyTimelineName: true,
      governanceTimelineName: true,
      financeTimelineName: true,
      strategyTimelineDept: true,
      governanceTimelineDept: true,
      financeTimelineDept: true,
    },
  });

  const data: Record<string, any[]> = {};

  const canSee = (dept: string) => isAdmin || role === dept;

  if (canSee("STRATEGY")) {
    data["STRATEGY"] = await prisma.strategicStage.findMany({
      orderBy: [{ charityId: "asc" }, { order: "asc" }],
    });
  }
  if (canSee("GOVERNANCE")) {
    data["GOVERNANCE"] = await prisma.governanceStage.findMany({
      orderBy: [{ charityId: "asc" }, { order: "asc" }],
    });
  }
  if (canSee("FINANCE")) {
    data["FINANCE"] = await prisma.financeStage.findMany({
      orderBy: [{ charityId: "asc" }, { order: "asc" }],
    });
  }

  // Generic (custom) services
  const isSpecialDept = BUILTIN_DEPTS.includes(role);
  if (isAdmin) {
    data["SERVICES"] = await prisma.service.findMany({
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { charityId: "asc" },
    });
  } else if (!isSpecialDept) {
    // Roles like PROGRAMS, HR, etc. only see their own services
    data["SERVICES"] = await prisma.service.findMany({
      where: { department: role },
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { charityId: "asc" },
    });
  }

  return (
    <ServicesOverviewClient
      charities={charities}
      stagesData={data}
      isAdmin={isAdmin}
      deptLabels={DEPT_LABELS}
    />
  );
}
