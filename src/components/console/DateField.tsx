"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAY_LABELS } from "@/lib/attendanceTime";
import {
  formatDateShort,
  formatDateWithWeekday,
  isISODate,
  isOutOfRange,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  toISODate,
  WEEKDAY_INITIALS,
  type MonthKey,
} from "@/lib/calendarGrid";
import { cx, field } from "./ui";

/**
 * محدِّدُ تاريخٍ بهوية الموقع — بديلُ `input[type=date]` في اللوحة والبوّابة
 * وكلِّ صفحةٍ عامّة.
 *
 * `input[type=date]` يُرسَم بواجهة نظام التشغيل لا بواجهة الموقع: تقويمُ ويندوز
 * بخطّه وأزرقِه وزواياه الحادّة، وفي ويندوز العربيّ يُعرض هجريّاً عند بعض
 * الناس وميلاديّاً عند غيرهم — فيختلف ما يراه موظّفان على الحقل الواحد. وفي
 * سفاري الجوّال عجلةٌ ثالثةُ الشكل. ولا يقبل تنسيقاً: لا لونَ هويةٍ، ولا
 * حلقةَ تركيزٍ من العدّة، ولا اسمَ يومٍ يُقرأ مع التاريخ.
 *
 * فهذا تقويمٌ مكتوبٌ بعناصرَ عاديّة: ميلاديٌّ دائماً، أسبوعُه يبدأ بالأحد،
 * واسمُ اليوم مكتوبٌ في الزرّ لا مخمَّنٌ من الرقم — وهو الذي سألت عنه كلُّ
 * شاشةٍ فيها تاريخ: «أيُّ يومٍ هذا؟».
 *
 * **والعقدُ هو عقدُ الحقل الأصليّ**: القيمةُ نصُّ «YYYY-MM-DD»، و`onChange`
 * يُعطي نصّاً — فاستبدالُه في مئةِ موضعٍ لا يُغيّر منطقَ أيٍّ منها.
 *
 * واللوحةُ تُرسم في جسم الصفحة كلوحةِ `Select`: الحاوياتُ التي تعيش فيها هذه
 * الحقول مقصوصةٌ بـ`overflow-hidden` أو قابلةٌ للتمرير، فالمُطلَقُ داخلها
 * يُقصّ عند حافّتها.
 */

const PANEL_WIDTH = 288;
const PANEL_HEIGHT = 348;
const GAP = 6;

type Position = { left: number; top?: number; bottom?: number };

export default function DateField({
  value,
  onChange,
  id,
  min,
  max,
  placeholder = "اختر التاريخ",
  disabled = false,
  required = false,
  /** يُظهر اسمَ اليوم مع التاريخ في الزرّ. يُطفأ حيث يضيق الموضع. */
  withWeekday = true,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  withWeekday?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [month, setMonth] = useState<MonthKey | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  /**
   * «اليوم» بحساب الرياض — يُقرأ في لحظة الفتح، لا في أثناء الرسم ولا في أثرٍ
   * يعقبه.
   *
   * قراءةُ الساعة في الرسم غيرُ نقيّة وتختلف بين الخادم والمتصفّح فتُفسد أوّلَ
   * رسمة، وقراءتُها في `useEffect` تُعيد الرسم مرّةً بلا داعٍ. والفتحُ حدثٌ من
   * المستعمل، وهو موضعُ قراءةِ الساعة الصحيح.
   */
  const [today, setToday] = useState("");

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - PANEL_WIDTH), window.innerWidth - PANEL_WIDTH - 8);
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;

    if (below < PANEL_HEIGHT && above > below) {
      setPosition({ left, bottom: window.innerHeight - rect.top + GAP });
      return;
    }
    setPosition({ left, top: rect.bottom + GAP });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) place();
  }, [isOpen, place]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onReflow = () => place();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [isOpen, place]);

  const open = () => {
    if (disabled) return;
    const now = toISODate(new Date(Date.now() + 3 * 60 * 60 * 1000));
    setToday(now);
    // يُفتح على شهر القيمة المختارة، وإلّا على شهر اليوم.
    setMonth(monthOf(value, now));
    setIsOpen(true);
  };

  const pick = (date: string) => {
    onChange(date);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const shown = month ?? monthOf(value, today || "1970-01-01");
  const weeks = monthGrid(shown);
  const label = isISODate(value)
    ? withWeekday
      ? formatDateWithWeekday(value, WEEKDAY_LABELS)
      : formatDateShort(value)
    : "";

  const panel =
    isOpen && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="اختيار التاريخ"
            dir="rtl"
            style={{ position: "fixed", left: position.left, top: position.top, bottom: position.bottom, width: PANEL_WIDTH }}
            className="z-[130] rounded-lg border border-slate-200/80 bg-white p-3 shadow-[0_12px_32px_-12px_rgb(15_23_42/0.28)] animate-[zad-pop-in_120ms_ease-out] dark:border-slate-700 dark:bg-slate-900"
          >
            {/* رأسُ اللوحة: الشهرُ وسهماه. والسهمُ «السابق» يمينٌ في RTL —
                اتّجاهُ الزمن يتبع اتّجاه القراءة. */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(shown, -1))}
                aria-label="الشهر السابق"
                className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronRight className="size-4" />
              </button>

              <span className="text-body font-semibold text-slate-800 tabular-nums dark:text-slate-100">
                {monthLabel(shown)}
              </span>

              <button
                type="button"
                onClick={() => setMonth(shiftMonth(shown, 1))}
                aria-label="الشهر التالي"
                className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAY_INITIALS.map((initial, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={cx(
                    "flex h-6 items-center justify-center text-caption font-semibold",
                    // الجمعةُ والسبتُ آخرُ عمودين: عطلةٌ تُميَّز بخفوتٍ لا بلون.
                    i >= 5 ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {initial}
                </span>
              ))}

              {weeks.flat().map((cell) => {
                const blocked = isOutOfRange(cell.date, min, max);
                const selected = cell.date === value;
                const isToday = cell.date === today;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={blocked}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={selected}
                    onClick={() => pick(cell.date)}
                    className={cx(
                      "flex h-8 items-center justify-center rounded-md text-body tabular-nums outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-primary/40",
                      selected
                        ? "bg-primary font-semibold text-white"
                        : blocked
                          ? "cursor-not-allowed text-slate-300 dark:text-slate-700"
                          : cell.inMonth
                            ? "text-slate-700 hover:bg-primary/[0.08] dark:text-slate-200 dark:hover:bg-teal-400/10"
                            : // أيامُ الجارين تبقى قابلةً للنقر: من رأى ٣٠ أكتوبر
                              // في صفّ نوفمبر أراده، لا أن يُبحث عنه بسهم.
                              "text-slate-300 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800",
                      // حلقةٌ خفيفةٌ على اليوم، تحت المختار لا فوقه.
                      isToday && !selected && "ring-1 ring-inset ring-primary/35 dark:ring-teal-400/35"
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <button
                type="button"
                disabled={!today || isOutOfRange(today, min, max)}
                onClick={() => pick(today)}
                className="rounded-md px-2 py-1 text-meta font-medium text-primary outline-none transition-colors hover:bg-primary/[0.08] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40 dark:text-teal-300 dark:hover:bg-teal-400/10"
              >
                اليوم
              </button>

              {!required && isISODate(value) && (
                <button
                  type="button"
                  onClick={() => pick("")}
                  className="rounded-md px-2 py-1 text-meta font-medium text-slate-500 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  مسح التاريخ
                </button>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cx("relative", className)} dir="rtl">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            open();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cx(field, "flex items-center gap-2 text-right", isOpen && "border-primary/60 ring-[3px] ring-primary/15")}
      >
        <Calendar className="size-4 shrink-0 text-slate-400" />
        <span className={cx("flex-1 truncate", !label && "text-slate-400 dark:text-slate-600")}>
          {label || placeholder}
        </span>
      </button>

      {/* حقلٌ أصليٌّ مخفيٌّ للحقل الإلزاميّ وحدَه: `required` حكمٌ يُنفّذه
          المتصفّح على عناصر النماذج، والزرُّ ليس منها. ويبقى مرئيّاً للمتصفّح
          (شفافٌ بحجم نقطة فوق الحقل) لا `display:none` — وإلّا رفض إظهار
          رسالته وقال «عنصرٌ غير قابلٍ للتركيز». */}
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-4 size-px opacity-0"
        />
      )}

      {panel}
    </div>
  );
}

/**
 * اختيارُ وقتٍ بهوية الموقع — `input[type=time]` موضوعاً في حقل العدّة.
 *
 * وهو أصليٌّ عن قصد: عجلةُ الوقت في الجوّال ولوحةُ المفاتيح في سطح المكتب
 * أسرعُ من أيّ قائمةٍ نكتبها، والخلافُ الذي أوجب كتابةَ التقويم — تقويمٌ
 * هجريٌّ عند بعض الناس — لا نظيرَ له في الساعة. فالموحَّدُ هنا المظهرُ
 * والأيقونةُ وحلقةُ التركيز.
 */
export function TimeField({
  value,
  onChange,
  id,
  disabled = false,
  required = false,
  step,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** ثوانٍ — ٩٠٠ لربع ساعةٍ، مثلاً. */
  step?: number;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      step={step}
      className={cx(field, "font-mono", className)}
    />
  );
}
