import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import MailClient from "./MailClient";

export const dynamic = "force-dynamic";

export default async function MailPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string };
}) {
  const session = await getSession();

  if (!session || !session.id) {
    redirect("/main");
  }

  // All active employees for composing mail
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <MailClient 
      session={session} 
      employees={employees} 
      initialTab={searchParams.tab || "inbox"} 
    />
  );
}
