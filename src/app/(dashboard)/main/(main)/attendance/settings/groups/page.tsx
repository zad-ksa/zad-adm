export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import SettingsShell from "../SettingsShell";
import GroupsClient from "./GroupsClient";

export const metadata: Metadata = { title: "مجموعات الدوام | زاد التنموية" };

export default async function ShiftGroupsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const [groups, employees] = await Promise.all([
    prisma.zadShiftGroup.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, shiftGroupId: true },
    }),
  ]);

  // Everyone with no group of their own follows whichever group holds the
  // default flag, so they are the number that moves when the flag moves. The
  // screen derives each group's roster from the same rule.
  const unassigned = employees.filter((e) => !e.shiftGroupId).length;

  return (
    <SettingsShell
      title="مجموعات الدوام"
      description="لكل مجموعة أوقاتها وأيام عملها. تعديل مجموعة يسري على الأيام القادمة ولا يُعيد تصنيف ما مضى."
      canViewReports={hasPermission(
        session.role,
        session.permissions || [],
        "view_zad_attendance_reports"
      )}
    >
      <GroupsClient
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          startTime: g.startTime,
          endTime: g.endTime,
          workDays: g.workDays,
          isDefault: g.isDefault,
        }))}
        employees={employees}
        unassignedCount={unassigned}
      />
    </SettingsShell>
  );
}
