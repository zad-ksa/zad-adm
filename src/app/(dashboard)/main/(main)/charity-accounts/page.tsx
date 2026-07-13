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

  // Fetch all accounts with role CHARITY_CLIENT
  const accounts = await prisma.employee.findMany({
    where: { role: "CHARITY_CLIENT" },
    include: {
      charity: { select: { name: true } }
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
        charityName: a.charity?.name || "غير محدد",
        permissions: a.permissions,
        createdAt: a.createdAt.toISOString()
      }))} 
    />
  );
}
