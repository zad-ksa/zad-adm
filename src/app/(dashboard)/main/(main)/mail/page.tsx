import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import MailClient from "./MailClient";
import { getInbox, getSentMails, getDrafts, getStarredMails, getTrashMails } from "@/app/actions/mail";

const PAGE_SIZE = 20;

/**
 * Loads the folder named in the URL, not always the inbox — opening
 * /main/mail?tab=sent straight from a link has to arrive showing the sent
 * folder, otherwise the client would immediately refetch and we would be back
 * to two round trips.
 */
function loadFolder(tab: string) {
  switch (tab) {
    case "sent": return getSentMails(1, PAGE_SIZE, "");
    case "drafts": return getDrafts(1, PAGE_SIZE, "");
    case "starred": return getStarredMails(1, PAGE_SIZE, "");
    case "trash": return getTrashMails(1, PAGE_SIZE, "");
    default: return getInbox(1, PAGE_SIZE, "");
  }
}

export const dynamic = "force-dynamic";

export default async function MailPage(props: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  // Which folder to load is in the URL, so this one await comes first; it
  // resolves without I/O.
  const searchParams = await props.searchParams;
  const tab = searchParams.tab || "inbox";

  // Independent of each other, so they go out together rather than one after
  // the other. Each is a round trip to ap-southeast-2, and until the last lands
  // the page streams nothing — which is the pause the user sees on the OLD page
  // before the loading state appears.
  const [session, employees, initialMails] = await Promise.all([
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
    loadFolder(tab),
  ]);

  if (!session || !session.id) {
    redirect("/main");
  }

  // `tab` here only decides what the FIRST paint shows. Switching folders
  // afterwards is handled entirely in the client (see handleTabChange) and does
  // not re-run this page, so there is nothing to key on.
  return (
    <MailClient
      session={session}
      employees={employees}
      initialTab={tab}
      initialMails={initialMails}
    />
  );
}
