"use client";

import { useState } from "react";
import { Plus, Calendar, Clock, Copy, CheckCircle2, Trash2, Power, ExternalLink } from "lucide-react";
import { createMeetingSchedule, toggleMeetingScheduleActive, deleteMeetingSchedule } from "@/app/actions/meeting-schedules";
import CreateMeetingScheduleModal from "./CreateMeetingScheduleModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CharityMeetingsClient({ initialSchedules }: { initialSchedules: any[] }) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/book-meeting/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await toggleMeetingScheduleActive(id, !currentStatus);
    if (res.success) {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive: !currentStatus } : s));
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجدول؟ ستفقد جميع المواعيد المحجوزة.")) return;
    const res = await deleteMeetingSchedule(id);
    if (res.success) {
      setSchedules(prev => prev.filter(s => s.id !== id));
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex justify-end">
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          <span>جدول جديد</span>
        </button>
      </div>

      {/* Bento Grid for Schedules */}
      {schedules.length === 0 ? (
        <div className="bg-white dark:bg-[#111] rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد جداول اجتماعات</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md">
            قم بإنشاء جدول اجتماعات جديد وحدد الأوقات المتاحة لمشاركتها مع الجمعيات.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map(schedule => (
            <div 
              key={schedule.id}
              className={`bg-white dark:bg-[#111] rounded-3xl p-6 border ${schedule.isActive ? 'border-slate-200 dark:border-slate-800 hover:ring-2 hover:ring-primary/20' : 'border-slate-200/50 dark:border-slate-800/50 opacity-75'} transition-all duration-300 flex flex-col h-full group relative overflow-hidden`}
            >
              {schedule.isActive && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
              )}
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {schedule.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 w-fit px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    <span>المدة: {schedule.duration} دقيقة</span>
                  </div>
                </div>
                
                {/* Actions Menu */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl">
                  <button 
                    onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                    title={schedule.isActive ? "تعطيل الجدول" : "تفعيل الجدول"}
                    className={`p-2 rounded-lg transition-colors ${schedule.isActive ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(schedule.id)}
                    title="حذف الجدول"
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6 relative z-10 mt-auto">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-xs font-semibold text-slate-400 mb-1">الأيام المتاحة</p>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-300">
                    {Array.isArray(schedule.availableDays) ? schedule.availableDays.length : 0}
                  </p>
                </div>
                <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-2xl border border-primary/10 dark:border-primary/20">
                  <p className="text-xs font-semibold text-primary/70 mb-1">المواعيد المحجوزة</p>
                  <p className="text-lg font-black text-primary">
                    {schedule.bookings?.length || 0}
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <button 
                  onClick={() => handleCopyLink(schedule.slug)}
                  disabled={!schedule.isActive}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {copiedId === schedule.slug ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-500" /> <span>تم النسخ</span></>
                  ) : (
                    <><Copy className="w-4 h-4" /> <span>نسخ الرابط</span></>
                  )}
                </button>
                <Link 
                  href={`/book-meeting/${schedule.slug}`}
                  target="_blank"
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="معاينة الصفحة"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              
              {/* Recent Bookings List (if any) */}
              {schedule.bookings && schedule.bookings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                  <p className="text-xs font-bold text-slate-400 mb-2">أحدث الحجوزات:</p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                    {schedule.bookings.slice(0, 3).map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{booking.charityName}</span>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium font-mono">
                          <span>{booking.date}</span>
                          <span>{booking.startTime}</span>
                        </div>
                      </div>
                    ))}
                    {schedule.bookings.length > 3 && (
                      <p className="text-[10px] text-center text-slate-400 pt-1">+{schedule.bookings.length - 3} حجوزات أخرى</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateMeetingScheduleModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreated={(newSchedule: any) => {
            setSchedules(prev => [newSchedule, ...prev]);
            setIsCreateModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
