import { Metadata } from "next";
import { getMeetingSchedules } from "@/app/actions/meeting-schedules";
import CharityMeetingsClient from "./CharityMeetingsClient";

export const metadata: Metadata = {
  title: "الاجتماعات | منصة زاد",
};

export default async function CharityMeetingsPage() {
  const { data: schedules } = await getMeetingSchedules();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12" dir="rtl">
      {/* Header with Vercel Style */}
      <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 
              className="font-bold text-slate-900 dark:text-white tracking-tight text-xl md:text-2xl"
            >
              إدارة الاجتماعات مع الجمعيات
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              قم بإنشاء وتخصيص روابط لمواعيد الاجتماعات المتاحة، وشاركها مع ممثلي الجمعيات ليتمكنوا من حجز أوقات تناسبهم بسهولة.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <CharityMeetingsClient initialSchedules={schedules || []} />
    </div>
  );
}
