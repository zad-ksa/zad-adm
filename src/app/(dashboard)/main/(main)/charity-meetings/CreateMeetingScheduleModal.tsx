"use client";

import { useState } from "react";
import { X, Plus, Calendar, Clock, Loader2, Trash2 } from "lucide-react";
import { createMeetingSchedule } from "@/app/actions/meeting-schedules";

export default function CreateMeetingScheduleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (schedule: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [days, setDays] = useState<{ date: string; startTime: string; endTime: string }[]>([
    { date: new Date().toISOString().split('T')[0], startTime: "09:00", endTime: "14:00" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddDay = () => {
    setDays([...days, { date: new Date().toISOString().split('T')[0], startTime: "09:00", endTime: "14:00" }]);
  };

  const handleRemoveDay = (index: number) => {
    setDays(days.filter((_, i) => i !== index));
  };

  const handleUpdateDay = (index: number, field: string, value: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], [field]: value };
    setDays(newDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (days.length === 0) {
      setError("يجب إضافة يوم واحد على الأقل");
      setIsSubmitting(false);
      return;
    }

    // Generate a random slug
    const slug = Math.random().toString(36).substring(2, 10);

    const res = await createMeetingSchedule({
      title,
      duration,
      slug,
      availableDays: days,
    });

    if (res.error) {
      setError(res.error);
      setIsSubmitting(false);
    } else if (res.success) {
      onCreated({ ...res.schedule, bookings: [] });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 relative z-10 shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">إنشاء جدول اجتماعات</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10">
          <form id="create-schedule-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">اسم الاجتماع</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: اجتماع ربع سنوي مع الجمعية"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">مدة الاجتماع (بالدقائق)</label>
              <div className="relative">
                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  required
                  min="15"
                  step="15"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">الأيام والأوقات المتاحة</label>
                <button 
                  type="button"
                  onClick={handleAddDay}
                  className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة يوم
                </button>
              </div>

              <div className="space-y-3">
                {days.map((day, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">التاريخ</label>
                      <input 
                        type="date" 
                        required
                        value={day.date}
                        onChange={e => handleUpdateDay(index, 'date', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-primary outline-none text-xs font-medium"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">من</label>
                      <input 
                        type="time" 
                        required
                        value={day.startTime}
                        onChange={e => handleUpdateDay(index, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-primary outline-none text-xs font-medium font-mono"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">إلى</label>
                      <input 
                        type="time" 
                        required
                        value={day.endTime}
                        onChange={e => handleUpdateDay(index, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-primary outline-none text-xs font-medium font-mono"
                      />
                    </div>
                    {days.length > 1 && (
                      <div className="flex items-end pb-1">
                        <button 
                          type="button"
                          onClick={() => handleRemoveDay(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative z-10 shrink-0 flex gap-3">
          <button 
            type="submit" 
            form="create-schedule-form"
            disabled={isSubmitting}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الجدول"}
          </button>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-70"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
}
