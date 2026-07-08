import { getAllServiceTemplates } from "@/app/actions/services";
import ManageServicesClient from "./ManageServicesClient";

export const metadata = {
  title: "إدارة قوالب الخدمات",
};

export default async function ManageServicesPage() {
  const templates = await getAllServiceTemplates();

  return (
    <ManageServicesClient 
      initialTemplates={templates}
    />
  );
}
