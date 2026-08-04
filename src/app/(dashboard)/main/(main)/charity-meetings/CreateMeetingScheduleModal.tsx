"use client";

import { useState } from "react";
import { X, Calendar, Clock, Loader2, Trash2, Wand2 } from "lucide-react";
import { createMeetingSchedule } from "@/app/actions/meeting-schedules";

function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number) {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let current = new Date();
  current.setHours(startH, startM, 0, 0);
  
  const end = new Date();
  end.setHours(endH, endM, 0, 0);
  
  while (current < end) {
    const hours = current.getHours().toString().padStart(2, '0');
    const minutes = current.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    slots.push(timeString);
    
    current.setMinutes(current.getMinutes() + durationMinutes);
    if (current > end) {
      slots.pop(); 
    }
  }
  
  return slots;
}

export default function CreateMeetingScheduleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (schedule: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("14:00");
  
  const [generatedDays, setGeneratedDays] = useState<{ date: string; slots: string[] }[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = () => {
    setError("");
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setError("تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية");
      return;
    }

    const defaultSlots = generateTimeSlots(startTime, endTime, duration);
    if (defaultSlots.length === 0) {
      setError("لا يوجد أوقات متاحة ضمن هذه الفترة والمدة المحددة");
      return;
    }

    const newDays = [];
    let current = new Date(start);
    while (current <= end) {
      newDays.push({
        date: current.toISOString().split('T')[0],
        slots: [...defaultSlots]
      });
      current.setDate(current.getDate() + 1);
    }

    setGeneratedDays(newDays);
    setHasGenerated(true);
  };

  const handleRemoveSlot = (dateIndex: number, slotIndex: number) => {
    const newDays = [...generatedDays];
    newDays[dateIndex].slots.splice(slotIndex, 1);
    // If a day has no slots left, we can choose to leave it empty or remove it. Let's leave it empty so they see it.
    setGeneratedDays(newDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!hasGenerated || generatedDays.length === 0) {
      setError("يجب توليد الأوقات أولاً");
      setIsSubmitting(false);
      return;
    }

    // Filter out days that have no slots
    const finalDays = generatedDays.filter(d => d.slots.length > 0);
    
    if (finalDays.length === 0) {
      setError("يجب أن يحتوي الجدول على موعد واحد متاح على الأقل");
      setIsSubmitting(false);
      return;
    }

    const slug = Math.random().toString(36).substring(2, 10);

    const res = await createMeetingSchedule({
      title,
      duration,
      slug,
      availableDays: finalDays, // Save the slots directly
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
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 relative z-10 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">إنشاء جدول اجتماعات</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10">
          <form id="create-schedule-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">اسم الاجتماع</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: اجتماع ربع سنوي"
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
                    onChange={e => {
                      setDuration(parseInt(e.target.value));
                      setHasGenerated(false);
                    }}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                تحديد نطاق الأيام والأوقات
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">من تاريخ</label>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setHasGenerated(false); }}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">إلى تاريخ</label>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setHasGenerated(false); }}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">وقت البدء (يومياً)</label>
                  <input 
                    type="time" 
                    required
                    value={startTime}
                    onChange={e => { setStartTime(e.target.value); setHasGenerated(false); }}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm font-medium font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">وقت الانتهاء (يومياً)</label>
                  <input 
                    type="time" 
                    required
                    value={endTime}
                    onChange={e => { setEndTime(e.target.value); setHasGenerated(false); }}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary outline-none text-sm font-medium font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full mt-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                توليد الأوقات
              </button>
            </div>

            {hasGenerated && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  الأوقات المتاحة للحجز (يمكنك حذف أي وقت بالنقر عليه)
                </h3>
                
                <div className="space-y-4">
                  {generatedDays.map((day, dIdx) => (
                    <div key={dIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {day.date}
                      </div>
                      
                      {day.slots.length === 0 ? (
                        <p className="text-xs text-slate-400">لا يوجد أوقات متاحة في هذا اليوم.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {day.slots.map((slot, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleRemoveSlot(dIdx, sIdx)}
                              className="group flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-red-50 dark:hover:bg-red-950/30 text-primary hover:text-red-600 rounded-lg text-sm font-bold font-mono transition-colors border border-primary/20 hover:border-red-200 dark:hover:border-red-900/50"
                              title="حذف هذا الموعد"
                            >
                              <span>{slot}</span>
                              <X className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative z-10 shrink-0 flex gap-3">
          <button 
            type="submit" 
            form="create-schedule-form"
            disabled={isSubmitting || !hasGenerated}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ وإنشاء الجدول"}
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
