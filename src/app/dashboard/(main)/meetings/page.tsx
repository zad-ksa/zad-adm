import { getMeetings } from "@/app/actions/meetings";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import MeetingsClient from "./MeetingsClient";
import { hasPermission, AUTO_ADMIN_ROLES } from "@/lib/permissions";

const ALL_STAFF = [
  "ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER",
  "ADMINISTRATIVE_SECRETARIAT", "STRATEGY", "FINANCE", "GOVERNANCE"
];

export default async function MeetingsPage() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_meetings")) redirect("/dashboard");

  const isTier1 = AUTO_ADMIN_ROLES.includes(session.role) || 
    session.permissions?.includes("developer_mode") || 
    ["EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);

  const [meetings, charities, employees] = await Promise.all([
    getMeetings(),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    isTier1
      ? prisma.employee.findMany({
          where: { isActive: true, role: { not: "CHARITY_CLIENT" } },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <MeetingsClient
      meetings={meetings as any}
      charities={charities}
      employees={employees}
      sessionId={session.id}
      sessionRole={session.role}
      isTier1={isTier1}
    />
  );
}
