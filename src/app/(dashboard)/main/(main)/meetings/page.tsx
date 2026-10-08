import { getMeetings } from "@/app/actions/meetings";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import MeetingsClient from "./MeetingsClient";
import { hasPermission, isTier1 as checkTier1 } from "@/lib/permissions";


export default async function MeetingsPage() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_meetings")) redirect("/main");

  const isTier1 = checkTier1(session.role, session.permissions || []);
  // من يملكها يرى لوحة "المهام المعلّقة من المحاضر السابقة" في كل مجموعة،
  // ويستطيع التحكم بمهام أي محضر لا محاضره فقط — انظر requireTaskControlAccess.
  const canViewAllTasks = hasPermission(session.role, session.permissions || [], "view_all_tasks");

  const [meetings, charities, employees] = await Promise.all([
    getMeetings(),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    isTier1 || canViewAllTasks
      ? prisma.employee.findMany({
        where: { isActive: true },
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
      canViewAllTasks={canViewAllTasks}
    />
  );
}
