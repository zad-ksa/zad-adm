import { getMeetings } from "@/app/actions/meetings";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import MeetingsClient from "./MeetingsClient";

const ALL_STAFF = [
  "ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER",
  "ADMINISTRATIVE_SECRETARIAT", "STRATEGY", "FINANCE", "GOVERNANCE"
];

export default async function MeetingsPage() {
  const session = await getSession();
  if (!session || !ALL_STAFF.includes(session.role)) redirect("/dashboard");

  const TIER1 = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];
  const isTier1 = TIER1.includes(session.role);

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
