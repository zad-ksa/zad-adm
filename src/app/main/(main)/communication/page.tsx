import { getCommunicationData } from "@/app/actions/communication";
import CommunicationClient from "./CommunicationClient";

export const metadata = {
  title: "التواصل | زاد التنموية",
  description: "إدارة مسؤولي التواصل للخدمات",
};

export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const { charities, success } = await getCommunicationData();

  if (!success || !charities) {
    return <div className="p-8 text-center text-red-500 font-bold">فشل في جلب البيانات</div>;
  }

  return <CommunicationClient charities={charities} />;
}
