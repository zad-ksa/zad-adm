import { getServicesForManagement, getCharitiesForSelect } from "@/app/actions/services";
import { getServiceAccessMap } from "@/app/actions/serviceAccess";
import { prisma } from "@/lib/db";
import ManageServicesClient from "./ManageServicesClient";

export const metadata = {
  title: "إدارة الخدمات",
};

export const dynamic = "force-dynamic";

export default async function ManageServicesPage() {
  const [services, charities, accessMap, employees] = await Promise.all([
    getServicesForManagement(),
    getCharitiesForSelect(),
    getServiceAccessMap(),
    // Active employees only: granting a service to a deactivated account is a
    // row nobody will ever look at again.
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ManageServicesClient
      initialServices={services}
      charities={charities}
      employees={employees}
      accessMap={accessMap}
    />
  );
}
