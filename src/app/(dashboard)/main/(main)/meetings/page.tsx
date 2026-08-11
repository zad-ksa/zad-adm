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

  const [meetings, charities, employees] = await Promise.all([
    getMeetings(),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    isTier1
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
    />
  );
}
