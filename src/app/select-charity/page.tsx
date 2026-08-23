import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SelectCharityClient from "./SelectCharityClient";

export default async function SelectCharityPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/charity-login");
  }

  if (session.userType !== "CHARITY_USER") {
    redirect("/main");
  }

  // Fetch the user's charities
  const user = await prisma.charityUser.findUnique({
    where: { id: session.id },
    include: {
      charities: {
        where: { isActive: true },
        include: { charity: true }
      }
    }
  });

  if (!user || user.charities.length === 0) {
    redirect("/charity-login");
  }

  if (user.charities.length === 1) {
    // If they only have one charity, they shouldn't be here, redirect them to it
    redirect(`/portal/${encodeURIComponent(user.charities[0].charity.name)}`);
  }

  const charities = user.charities.map(c => ({
    id: c.charityId,
    name: c.charity.name,
    assignedAt: c.assignedAt.toISOString()
  }));

  return <SelectCharityClient charities={charities} userName={user.name} />;
}
