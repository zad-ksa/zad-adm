import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import CharityAccountsClient from "./CharityAccountsClient";
import { hasPermission } from "@/lib/permissions";

export default async function CharityAccountsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role || "";
  const perms = session.permissions || [];
  const can = (p: string) => hasPermission(role, perms, p);

  // Must have admin capabilities
  if (!can("manage_charity_accounts") && !can("manage_employees") && !can("manage_charity_settings")) {
    redirect("/main");
  }

  // Fetch all charities to populate the select dropdown
  const charities = await prisma.charity.findMany({
    select: { id: true, name: true }
  });

  // Fetch all charity user accounts
  const accounts = await prisma.charityUser.findMany({
    include: {
      charities: {
        include: { charity: { select: { name: true, id: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <CharityAccountsClient 
      charities={charities} 
      accounts={accounts.map(a => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        title: a.title,
        charityNames: a.charities.map(c => c.charity.name),
        createdAt: a.createdAt.toISOString()
      }))} 
    />
  );
}
