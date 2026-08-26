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
    // The employee list is only needed to populate the reply/forward pickers —
    // it does not depend on the mail. Awaiting it after getMailById cost a
    // second full round trip to ap-southeast-2 before the page could render.
    const [mail, employees] = await Promise.all([
      getMailById(params.id),
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true, avatarUrl: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return <MailViewClient session={session} mail={mail} employees={employees} />;
  } catch (error) {
    console.error("Error loading mail:", error);
    redirect("/main/mail");
  }
}
