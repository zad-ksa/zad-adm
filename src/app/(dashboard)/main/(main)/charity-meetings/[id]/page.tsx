import { prisma } from "@/lib/db";
import { PageHeader, theadRowClass, thClass, tbodyClass, tdClass } from "@/components/console/layout";
import { notFound } from "next/navigation";
import { Calendar, Clock, User, MessageSquareText, Phone } from "lucide-react";
import { formatClock12 } from "@/lib/attendanceTime";
import { cx } from "@/components/console/ui";

export default async function CharityMeetingBookingsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  
  const schedule = await prisma.meetingSchedule.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: [
          { date: 'desc' },
          { startTime: 'asc' }
        ]
      },
      alternativeRequests: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!schedule) {
    notFound();
  }

  // Helper to format date and get the day name
  const getDayName = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date(dateStr));
    } catch {
      return "";
    }
  };

  const formatDate = (date: Date) => {
    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <PageHeader
          crumbs={[
            { label: "اجتماعات الجمعيات", href: "/main/charity-meetings" },
            { label: schedule.title },
          ]}
          title={schedule.title}
          description="جدول المواعيد المحجوزة"
        />
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-section">المواعيد المحجوزة</h2>
              <p className="text-caption text-slate-500 dark:text-slate-400">إجمالي الحجوزات: {schedule.bookings.length}</p>
            </div>
          </div>
        </div>

        {schedule.bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-section">لا توجد مواعيد محجوزة حتى الآن</p>
            <p className="text-caption mt-1">عندما تقوم إحدى الجمعيات بحجز موعد سيظهر هنا.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-caption text-right">
              <thead >
                <tr className={theadRowClass}>
                  <th className={thClass}>الجمعية</th>
                  <th className={thClass}>اليوم</th>
                  <th className={thClass}>التاريخ</th>
                  <th className={thClass}>الوقت</th>
                  <th className={thClass}>تاريخ الحجز</th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {schedule.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className={cx(tdClass, "font-semibold text-slate-800 dark:text-slate-200")}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {booking.charityName}
                      </div>
                    </td>
                    <td className={cx(tdClass, "text-slate-600 dark:text-slate-300")}>
                      {getDayName(booking.date)}
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span dir="ltr" className="inline-block">{booking.date}</span>
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span dir="ltr" className="inline-block font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">{formatClock12(booking.startTime)}</span>
                      </div>
                    </td>
                    <td className={cx(tdClass, "text-caption text-slate-400 dark:text-slate-500")}>
                      {formatDate(booking.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alternative Time Requests */}
      {schedule.allowAlternativeRequest && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-section">طلبات مواعيد بديلة</h2>
              <p className="text-caption text-slate-500 dark:text-slate-400">
                جمعيات لم يناسبها أي من الأوقات المتاحة — إجمالي الطلبات: {schedule.alternativeRequests.length}
              </p>
            </div>
          </div>

          {schedule.alternativeRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <MessageSquareText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-section">لا توجد طلبات مواعيد بديلة حتى الآن</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {schedule.alternativeRequests.map((req) => (
                <div key={req.id} className="p-6 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="sm:w-56 shrink-0 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <User className="w-4 h-4 text-slate-400" />
                      {req.charityName}
                    </div>
                    {req.contactPhone && (
                      <div dir="ltr" className="flex items-center gap-2 text-caption text-slate-500 dark:text-slate-400 justify-end sm:justify-start">
                        <Phone className="w-3.5 h-3.5" />
                        {req.contactPhone}
                      </div>
                    )}
                    <p className="text-caption text-slate-400 dark:text-slate-500">{formatDate(req.createdAt)}</p>
                  </div>
                  <p className="flex-1 text-caption text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                    {req.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
