import { Metadata } from "next";
import { PageHeader } from "@/components/console/layout";
import { getMeetingSchedules } from "@/app/actions/meeting-schedules";
import { prisma } from "@/lib/db";
import CharityMeetingsClient from "./CharityMeetingsClient";

export const metadata: Metadata = {
  title: "الاجتماعات | منصة زاد",
};

export default async function CharityMeetingsPage() {
  const [{ data: schedules }, charities] = await Promise.all([
    getMeetingSchedules(),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12" dir="rtl">
      <PageHeader
        title="اجتماعات الجمعيات"
        description="قم بإنشاء وتخصيص روابط لمواعيد الاجتماعات المتاحة، وشاركها مع ممثلي الجمعيات ليتمكنوا من حجز أوقات تناسبهم بسهولة."
      />

      {/* Main Content Area */}
      <CharityMeetingsClient initialSchedules={schedules || []} charities={charities} />
    </div>
  );
}
