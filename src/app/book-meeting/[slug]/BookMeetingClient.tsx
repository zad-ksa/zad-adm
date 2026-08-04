"use client";

import { useState } from "react";
import { Calendar, Clock, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { bookMeetingSlot } from "@/app/actions/meeting-schedules";

function formatDateWithDayName(dateString: string) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

export default function BookMeetingClient({ schedule }: { schedule: any }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [charityName, setCharityName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const availableDays = schedule.availableDays || [];
  const bookings = schedule.bookings || [];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    
    setError("");
    setIsSubmitting(true);
    
    const res = await bookMeetingSlot({
      scheduleId: schedule.id,
      charityName,
      date: selectedDate,
      startTime: selectedSlot
    });
    
    if (res.error) {
      setError(res.error);
      setIsSubmitting(false);
    } else {
      setSuccess(true);
      setIsSubmitting(false);
    }
  };

  const getDaySlots = (date: string) => {
    const dayConfig = availableDays.find((d: any) => d.date === date);
    if (!dayConfig) return [];
    
    const allSlots = dayConfig.slots || [];
    
    return allSlots.map((time: string) => {
      const isBooked = bookings.some((b: any) => b.date === date && b.startTime === time);
      return { time, isBooked };
    });
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-[#111] rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center animate-in zoom-in-95 duration-500 max-w-2xl mx-auto mt-12">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">تم حجز الموعد بنجاح!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
          شكراً لك، تم تسجيل الموعد الخاص بجمعية <span className="font-bold text-slate-800 dark:text-slate-200">{charityName}</span> في يوم <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDate ? formatDateWithDayName(selectedDate) : ''}</span> الساعة <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{selectedSlot}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* Intro Header */}
      <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 relative bg-slate-50/50 dark:bg-slate-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h2 
            className="font-bold text-slate-900 dark:text-white tracking-tight mb-3"
            style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", lineHeight: 1.2 }}
          >
            {schedule.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="w-4 h-4" />
            <span>مدة الاجتماع: {schedule.duration} دقيقة</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col md:flex-row">
        
        {/* Left Column (Dates) - Right in RTL */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-l border-slate-100 dark:border-slate-800 p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            اختر اليوم المناسب
          </h3>
          
          <div className="space-y-2">
            {availableDays.map((day: any) => (
              <button
                key={day.date}
                onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                  selectedDate === day.date
                    ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>{formatDateWithDayName(day.date)}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedDate === day.date ? "" : "opacity-0 -translate-x-2"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column (Times & Form) */}
        <div className="flex-1 p-6 bg-slate-50/50 dark:bg-[#111]">
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <Calendar className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-slate-500 dark:text-slate-500 font-medium text-sm">الرجاء اختيار اليوم أولاً لاستعراض الأوقات المتاحة</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm">
                  الأوقات المتاحة ليوم {formatDateWithDayName(selectedDate)}
                </h3>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {getDaySlots(selectedDate).length === 0 ? (
                    <p className="col-span-full text-xs text-slate-400">لا يوجد أوقات متاحة في هذا اليوم.</p>
                  ) : (
                    getDaySlots(selectedDate).map(({ time, isBooked }: { time: string, isBooked: boolean }) => (
                      <button
                        key={time}
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(time)}
                        className={`py-2 rounded-xl text-sm font-bold font-mono transition-all border ${
                          isBooked
                            ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60 cursor-not-allowed line-through decoration-slate-300 dark:decoration-slate-600"
                            : selectedSlot === time
                              ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-primary hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        {time}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selectedSlot && (
                <form onSubmit={handleBooking} className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm">تأكيد الحجز</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">اسم الجمعية</label>
                      <input 
                        type="text" 
                        required
                        value={charityName}
                        onChange={e => setCharityName(e.target.value)}
                        placeholder="أدخل اسم الجمعية هنا..."
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    
                    {error && (
                      <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                        {error}
                      </div>
                    )}
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !charityName.trim()}
                      className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-md shadow-primary/20 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد الموعد"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
