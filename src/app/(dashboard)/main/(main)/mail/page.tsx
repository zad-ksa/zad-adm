import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import MailClient from "./MailClient";

export const dynamic = "force-dynamic";

export default async function MailPage(props: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  // The employee list does not depend on the session beyond the auth check, so
  // both go out together rather than one after the other. Each is a round trip
  // to ap-southeast-2, and until the last one lands the page streams nothing —
  // which is the pause the user sees on the OLD page before the loading state
  // appears.
  const [searchParams, session, employees] = await Promise.all([
    props.searchParams,
    getSession(),
    // All active employees for composing mail
    prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!session || !session.id) {
    redirect("/main");
  }

  return (
    <MailClient 
      session={session} 
      employees={employees} 
      initialTab={searchParams.tab || "inbox"} 
    />
  );
}
