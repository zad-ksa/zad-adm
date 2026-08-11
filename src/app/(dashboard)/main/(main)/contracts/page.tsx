import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ContractsClient from "./ContractsClient";
import { isAdmin } from "@/lib/permissions";

export default async function ContractsPage() {
  const session = await getSession();
  if (!session || (!session.permissions?.includes("manage_contracts") && !session.permissions?.includes("developer_mode") && !isAdmin(session.role))) {
    redirect("/main");
  }

  const canEdit = isAdmin(session.role) || !!session.permissions?.includes("edit_contracts") || !!session.permissions?.includes("developer_mode");

  const charities = await prisma.charity.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contractInstallments: {
        orderBy: { dueDate: 'asc' }
      }
    }
  });

  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());

  const contractsData = charities.map((charity: any) => {
    const total = charity.contractValue || 0;
    
    // Status logic: if total is set and all installments are paid, it's completed.
    // If no total is set, or some installments are unpaid, it's active.
    let status = "active";
    if (total > 0 && charity.contractInstallments.length > 0) {
        const allPaid = charity.contractInstallments.every((i: any) => i.isPaid);
        if (allPaid) status = "completed";
    }

    return {
      id: charity.id,
      charityName: charity.name,
      totalValue: total,
      creationDate: charity.createdAt.toISOString().split('T')[0],
      status,
      installments: charity.contractInstallments
    };
  });

  const totalContractsCount = contractsData.length;
  const activeContractsCount = contractsData.filter(c => c.status === "active").length;
  const totalValue = contractsData.reduce((sum, c) => sum + c.totalValue, 0);
  
  const totalPaidValue = contractsData.reduce((sum, c) => {
    const paid = c.installments.filter((i: any) => i.isPaid).reduce((acc: number, curr: any) => acc + curr.amount, 0);
    return sum + paid;
  }, 0);

  // Find installments due this month
  const dueThisMonth = contractsData.flatMap(c => 
    c.installments
      .filter((i: any) => {
        if (i.isPaid) return false;
        if (!i.dueDate) return false;
        const dueDate = new Date(i.dueDate);
        return String(dueDate.getFullYear()) === currentYear && String(dueDate.getMonth() + 1).padStart(2, '0') === currentMonth;
      })
      .map((i: any) => ({ ...i, charityName: c.charityName, contractId: c.id }))
  );
  
  const dueAmountThisMonth = dueThisMonth.reduce((sum, i) => sum + i.amount, 0);

  return (
    <ContractsClient 
      contractsData={contractsData}
      totalContractsCount={totalContractsCount}
      activeContractsCount={activeContractsCount}
      totalValue={totalValue}
      totalPaidValue={totalPaidValue}
      canEdit={canEdit}
      dueThisMonth={dueThisMonth}
      dueAmountThisMonth={dueAmountThisMonth}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  );
}
