import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import MailViewClient from "./MailViewClient";
import { getMailById } from "@/app/actions/mail";

export const dynamic = "force-dynamic";

export default async function MailViewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();

  if (!session || !session.id) {
    redirect("/main");
  }

  try {
    const mail = await getMailById(params.id);
    
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, avatarUrl: true },
    });

    return <MailViewClient session={session} mail={mail} employees={employees} />;
  } catch (error) {
    console.error("Error loading mail:", error);
    redirect("/main/mail");
  }
}
