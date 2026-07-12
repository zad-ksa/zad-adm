import { getServicesForManagement, getCharitiesForSelect } from "@/app/actions/services";
import ManageServicesClient from "./ManageServicesClient";

export const metadata = {
  title: "إدارة الخدمات",
};

export default async function ManageServicesPage() {
  const [services, charities] = await Promise.all([
    getServicesForManagement(),
    getCharitiesForSelect(),
  ]);

  return (
    <ManageServicesClient 
      initialServices={services}
      charities={charities}
    />
  );
}
