import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/main");
  }

  // Deliberately not in the session cookie: the cookie is a snapshot taken at
  // login, and an address the person just changed must show as changed.
  const account = await prisma.employee.findUnique({
    where: { id: session.id },
    select: { email: true, password: true },
  });

  return (
    <ProfileClient
      session={session}
      initialEmail={account?.email ?? ""}
      hasPassword={!!account?.password}
    />
  );
}
