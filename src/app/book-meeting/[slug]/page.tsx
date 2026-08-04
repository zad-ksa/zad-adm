import { Metadata } from "next";
import { getMeetingScheduleBySlug } from "@/app/actions/meeting-schedules";
import BookMeetingClient from "./BookMeetingClient";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: schedule } = await getMeetingScheduleBySlug(slug);
  
  if (!schedule) {
    return { title: "غير متوفر | زاد" };
  }

  return {
    title: `حجز موعد - ${schedule.title}`,
  };
}

export default async function BookMeetingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: schedule, error } = await getMeetingScheduleBySlug(slug);

  if (error || !schedule) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 shrink-0">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">بوابة المواعيد</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">منصة زاد التنموية</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <BookMeetingClient schedule={schedule} />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500 dark:text-slate-400 shrink-0">
        <p>© {new Date().getFullYear()} منصة زاد التنموية. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
