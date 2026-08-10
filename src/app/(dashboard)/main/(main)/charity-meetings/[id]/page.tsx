import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Calendar, Clock, ChevronRight, User } from "lucide-react";
import Link from "next/link";

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
        <Link 
          href="/main/charity-meetings"
          className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{schedule.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">جدول المواعيد المحجوزة</p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">المواعيد المحجوزة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي الحجوزات: {schedule.bookings.length}</p>
            </div>
          </div>
        </div>

        {schedule.bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-lg">لا توجد مواعيد محجوزة حتى الآن</p>
            <p className="text-sm mt-1">عندما تقوم إحدى الجمعيات بحجز موعد سيظهر هنا.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th className="px-6 py-4">الجمعية</th>
                  <th className="px-6 py-4">اليوم</th>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">الوقت</th>
                  <th className="px-6 py-4">تاريخ الحجز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {schedule.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {booking.charityName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {getDayName(booking.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span dir="ltr" className="inline-block">{booking.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span dir="ltr" className="inline-block font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">{booking.startTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(booking.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
