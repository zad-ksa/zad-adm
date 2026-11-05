"use client";

import { useMemo, useState } from "react";
import { Calendar, Clock, CheckCircle2, ChevronRight, Loader2, MessageSquareText } from "lucide-react";
import { bookMeetingSlot, submitAlternativeRequest } from "@/app/actions/meeting-schedules";
import { formatClock12, WEEKDAY_LABELS } from "@/lib/attendanceTime";
import { formatDateWithWeekday, toISODate } from "@/lib/calendarGrid";
import DateField, { TimeField } from "@/components/console/DateField";
import { btn, cx, field } from "@/components/console/ui";
import {
  dayOfferedSlots,
  parseAvailableDays,
  parseMeetingRules,
  slotStateLabel,
  type OfferedSlot,
} from "@/lib/meetingSlots";

/**
 * «الإثنين ٩ نوفمبر ٢٠٢٦».
 *
 * وكانت `Intl` بـ`ar-SA` وحدَها: ذاك يُخرج التقويمَ **الهجريّ** افتراضاً،
 * فيُقرأ يومُ الاجتماع بتاريخٍ لا يطابق ما في الجدول ولا ما في الرسالة. والعدّةُ
 * تكتبه ميلاديّاً من الأرقام، فلا منطقةَ زمنيّةٍ تُزحزح اليومَ ولا تقويمَ
 * يتبدّل باختلاف المتصفّح.
 */
function formatDateWithDayName(dateString: string) {
  return formatDateWithWeekday(dateString, WEEKDAY_LABELS);
}

export default function BookMeetingClient({ schedule, nowMs }: { schedule: any; nowMs: number }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [charityName, setCharityName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [showAltForm, setShowAltForm] = useState(false);
  const [altCharityName, setAltCharityName] = useState("");
  // الموعدُ المقترح: تاريخٌ ووقتٌ مُختاران لا نصٌّ حرّ. وكان سطراً مكتوباً
  // بالكلام («الثلاثاء القادم بعد العصر») يُقرأ عشرةَ قراءاتٍ ولا يُجدول.
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [altMessage, setAltMessage] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [altSubmitting, setAltSubmitting] = useState(false);
  const [altSuccess, setAltSuccess] = useState(false);
  const [altError, setAltError] = useState("");

  /** الحجوزاتُ القائمة — ما يُقرأ منها هنا هو اليومُ والوقتُ وحدَهما. */
  const bookings: { date: string; startTime: string }[] = schedule.bookings ?? [];

  /**
   * حالةُ كل موعدٍ في كل يوم — من `lib/meetingSlots` لا من حسابٍ هنا.
   *
   * وهي الدالّةُ التي يحكم بها الخادمُ عند الإرسال، فما يُعرض مُقفَلاً هو
   * المردود، وما يُعرض مؤجَّلاً هو المقبول بوقته الجديد. وكان الحسابُ ها هنا
   * وحدَه: «مضى» بساعة المتصفّح، ولا إغلاقَ مسبقاً ولا جاراً يُقفل جاره.
   */
  const rules = useMemo(() => parseMeetingRules(schedule), [schedule]);

  /** يومُ الرياض المدنيُّ للحظة التي ختمها الخادم — حدُّ أدنى للموعد المقترح. */
  const todayISO = toISODate(new Date(nowMs + 3 * 60 * 60 * 1000));

  const days = useMemo(() => {
    const now = new Date(nowMs);
    return parseAvailableDays(schedule.availableDays)
      .map((day) => ({
        date: day.date,
        slots: dayOfferedSlots(
          day.slots,
          rules,
          bookings.filter((b) => b.date === day.date).map((b) => b.startTime),
          now,
          day.date
        ),
      }))
      // يومٌ انقضى حجزُ كلِّ مواعيده لا يُعرض: لا قرارَ فيه لمن يقرأه. أمّا
      // المحجوزُ والمُقفَلُ لجاره فيبقيان ظاهرين في يومهما — فغيابُهما يُقرأ
      // كأنّ الجدولَ لم يُعرضهما أصلاً.
      .filter((day) => day.slots.some((slot) => slot.state !== "CLOSED"));
  }, [schedule.availableDays, bookings, rules, nowMs]);

  const availableDays = days;

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

  const handleAltSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAltError("");
    setAltSubmitting(true);

    // الموعدُ المقترحُ أوّلَ الرسالة بصيغةٍ واحدةٍ ثابتة، والملاحظةُ بعده —
    // فمن يقرأه في اللوحة يرى اليومَ والساعةَ قبل كلِّ شيء، ولا يُحتاج عمودٌ
    // جديدٌ في القاعدة لنصٍّ يُقرأ بالعين.
    const proposed = `الموعد المقترح: ${formatDateWithDayName(altDate)} الساعة ${formatClock12(altTime)}`;
    const note = altMessage.trim();

    const res = await submitAlternativeRequest({
      scheduleId: schedule.id,
      charityName: altCharityName,
      message: note ? `${proposed}\n${note}` : proposed,
      contactPhone: altPhone.trim() || undefined,
    });

    if (res.error) {
      setAltError(res.error);
      setAltSubmitting(false);
    } else {
      setAltSuccess(true);
      setAltSubmitting(false);
    }
  };

  const getDaySlots = (date: string): OfferedSlot[] =>
    availableDays.find((d) => d.date === date)?.slots ?? [];

  if (success) {
    return (
      <div className="bg-white dark:bg-[#111] rounded-2xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-center animate-in zoom-in-95 duration-500 max-w-2xl mx-auto mt-12">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="mb-4 text-page font-bold text-slate-900 dark:text-white">تم حجز الموعد بنجاح!</h2>
        <p className="mx-auto mb-8 max-w-md text-body leading-relaxed text-slate-600 dark:text-slate-400">
          شكراً لك، تم تسجيل الموعد الخاص بجمعية <span className="font-bold text-slate-800 dark:text-slate-200">{charityName}</span> في يوم <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDate ? formatDateWithDayName(selectedDate) : ''}</span> الساعة <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{selectedSlot ? formatClock12(selectedSlot) : ''}</span>.
        </p>
      </div>
    );
  }

  if (altSuccess) {
    return (
      <div className="bg-white dark:bg-[#111] rounded-2xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-center animate-in zoom-in-95 duration-500 max-w-2xl mx-auto mt-12">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="mb-4 text-page font-bold text-slate-900 dark:text-white">تم استلام طلبكم بنجاح!</h2>
        <p className="mx-auto mb-8 max-w-md text-body leading-relaxed text-slate-600 dark:text-slate-400">
          شكراً لكم، تم إبلاغ الفريق المختص بالموعد المقترح من جمعية <span className="font-bold text-slate-800 dark:text-slate-200">{altCharityName}</span>، وسيتم التأكيد عليكم في أقرب فرصة أو التواصل معكم لتحديد أفضل موعد يناسب الطرفين.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* Intro Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 relative bg-slate-50/50 dark:bg-slate-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h2 
            className="mb-2 text-section font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {schedule.title}
          </h2>
          <div className="flex items-center gap-1.5 text-meta font-medium text-slate-500 dark:text-slate-400">
            <Clock className="size-3.5" />
            <span>مدة الاجتماع: {schedule.duration} دقيقة</span>
          </div>

          {/* ولا سطرَ قواعدَ هنا: المواعيدُ المُغلقةُ مكتوبٌ على كلٍّ منها
              «أُغلق الحجز»، فالقاعدةُ تُرى في الشبكة نفسِها. وجملةٌ تشرحها
              فوقها تُقرأ شرطاً جديداً قبل أن يُنظر في الأوقات. */}
        </div>
      </div>

      {/* الشبكةُ أو الاقتراح — أحدُهما لا كلاهما.

          وكان الاقتراحُ يُفتح **تحت** الشبكة، فيبقى الجدولُ معروضاً ويُكتب
          الطلبُ أسفل الشاشة بلا أن يُرى: من ضغط الزرَّ انتقل إلى مهمّةٍ أخرى،
          فتَحِلّ محلَّ الأولى ولها بابُ عودة. */}
      {showAltForm ? (
        <div className="p-6 space-y-5 animate-in fade-in duration-300">
          {/* العودةُ أوّلُ ما يُقرأ وفي جهة القراءة — يمينَ السطر في RTL —
              وبصيغةِ زرٍّ من العدّة لا سطراً رمادياً: الخروجُ من شاشةٍ حَلَّت
              محلَّ أخرى بابٌ لا بد أن يُرى من غير بحث. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { setShowAltForm(false); setAltError(""); }}
              className={cx(btn.secondary, "font-semibold")}
            >
              <ChevronRight className="size-4" />
              العودة إلى المواعيد المتاحة
            </button>

            <h3 className="flex items-center gap-2 text-body font-bold text-slate-800 dark:text-slate-200">
              <MessageSquareText className="size-4 text-primary" />
              اقتراح موعد آخر
            </h3>
          </div>

          <p className="text-meta leading-relaxed text-slate-500 dark:text-slate-400">
            في حال تعذر عليكم أي من الأوقات المتاحة، اقترحوا موعداً يناسبكم، وسيتم التأكيد عليكم في أقرب فرصة
            أو التواصل معكم لتحديد أفضل موعد للطرفين.
          </p>

          <form onSubmit={handleAltSubmit} className="space-y-4">
            <div>
              <label htmlFor="alt-charity" className="mb-1.5 block text-caption font-semibold uppercase tracking-widest text-slate-500">
                اسم الجمعية
              </label>
              <input
                id="alt-charity"
                type="text"
                required
                value={altCharityName}
                onChange={(e) => setAltCharityName(e.target.value)}
                placeholder="أدخل اسم الجمعية هنا..."
                className={field}
              />
            </div>

            {/* التاريخُ من تقويم العدّة — واسمُ اليوم يُكتب مع التاريخ فيه،
                فلا يُحسب بالأصابع على نصٍّ مكتوب. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="alt-date" className="mb-1.5 block text-caption font-semibold uppercase tracking-widest text-slate-500">
                  اليوم المقترح
                </label>
                <DateField
                  id="alt-date"
                  value={altDate}
                  onChange={setAltDate}
                  required
                  min={todayISO}
                  placeholder="اختر اليوم"
                />
              </div>
              <div>
                <label htmlFor="alt-time" className="mb-1.5 block text-caption font-semibold uppercase tracking-widest text-slate-500">
                  الساعة المقترحة
                </label>
                <TimeField id="alt-time" value={altTime} onChange={setAltTime} required step={900} />
              </div>
            </div>

            <div>
              <label htmlFor="alt-note" className="mb-1.5 block text-caption font-semibold uppercase tracking-widest text-slate-500">
                ملاحظات (اختياري)
              </label>
              <textarea
                id="alt-note"
                value={altMessage}
                onChange={(e) => setAltMessage(e.target.value)}
                rows={3}
                placeholder="مثال: نفضّل الاجتماع حضورياً في مقر الجمعية"
                className={cx(field, "h-auto resize-none py-2 leading-6")}
              />
            </div>

            <div>
              <label htmlFor="alt-phone" className="mb-1.5 block text-caption font-semibold uppercase tracking-widest text-slate-500">
                رقم للتواصل (اختياري)
              </label>
              <input
                id="alt-phone"
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className={cx(field, "text-right")}
              />
            </div>

            {altError && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-meta font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {altError}
              </div>
            )}

            <button
              type="submit"
              disabled={altSubmitting || !altCharityName.trim() || !altDate || !altTime}
              className={cx(btn.primary, "h-11 w-full")}
            >
              {altSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال الطلب"}
            </button>
          </form>
        </div>
      ) : (
      <>
      {/* Main Grid */}
      <div className="flex flex-col md:flex-row">

        {/* Left Column (Dates) - Right in RTL */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-l border-slate-100 dark:border-slate-800 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-body font-bold text-slate-800 dark:text-slate-200">
            <Calendar className="w-4 h-4 text-primary" />
            اختر اليوم المناسب
          </h3>
          
          <div className="space-y-2">
            {availableDays.map((day: any) => (
              <button
                key={day.date}
                onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-body font-semibold transition-all ${
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
              <p className="text-body font-medium text-slate-500 dark:text-slate-500">الرجاء اختيار اليوم أولاً لاستعراض الأوقات المتاحة</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div>
                <h3 className="mb-4 text-body font-bold text-slate-800 dark:text-slate-200">
                  الأوقات المتاحة ليوم {formatDateWithDayName(selectedDate)}
                </h3>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {getDaySlots(selectedDate).length === 0 ? (
                    <p className="col-span-full text-meta text-slate-400">لا يوجد أوقات متاحة في هذا اليوم.</p>
                  ) : (
                    getDaySlots(selectedDate).map((slot) => {
                      const blockedLabel = slotStateLabel(slot.state);
                      const taken = blockedLabel !== null;
                      return (
                        <button
                          key={slot.time}
                          disabled={taken}
                          onClick={() => setSelectedSlot(slot.offerTime)}
                          // سببُ المنع يُقال، فالموعدُ المشطوبُ بلا سبب يُقرأ
                          // كأنّ الصفحةَ معطوبة.
                          title={blockedLabel ?? undefined}
                          className={`flex flex-col items-center gap-0.5 rounded-lg border py-2 text-body font-semibold transition-all ${
                            taken
                              ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60 cursor-not-allowed"
                              : selectedSlot === slot.offerTime
                                ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-primary hover:border-primary/40 hover:bg-primary/5"
                          }`}
                        >
                          <span dir="ltr" className={`font-mono ${taken ? "line-through decoration-slate-300 dark:decoration-slate-600" : ""}`}>
                            {formatClock12(slot.offerTime)}
                          </span>
                          {taken ? (
                            <span className="text-caption font-semibold">{blockedLabel}</span>
                          ) : slot.delayMinutes > 0 ? (
                            // الوقتُ المعروضُ ليس المكتوبَ في الجدول، فيُقال
                            // لئلّا يحضر أحدٌ على الوقت الذي كان.
                            <span className="text-caption font-semibold opacity-70">أُجِّل {slot.delayMinutes} د</span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedSlot && (
                <form onSubmit={handleBooking} className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
                  <h3 className="mb-4 text-body font-bold text-slate-800 dark:text-slate-200">تأكيد الحجز</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-caption font-semibold uppercase tracking-widest text-slate-500">اسم الجمعية</label>
                      <input 
                        type="text" 
                        required
                        value={charityName}
                        onChange={e => setCharityName(e.target.value)}
                        placeholder="أدخل اسم الجمعية هنا..."
                        className={field}
                      />
                    </div>
                    
                    {error && (
                      <div className="rounded-md bg-red-50 px-3 py-2 text-meta font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                        {error}
                      </div>
                    )}
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !charityName.trim()}
                      className={cx(btn.primary, "h-11 w-full")}
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

      {schedule.allowAlternativeRequest && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20">
          <button
            type="button"
            onClick={() => setShowAltForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md py-1 text-body font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
          >
            <MessageSquareText className="w-4 h-4" />
            لا يناسبكم أي من الأوقات أعلاه؟ اقترحوا موعداً آخر
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
