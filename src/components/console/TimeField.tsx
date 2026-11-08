"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import {
  formatTime12,
  HOUR_OPTIONS,
  isTimeOutOfRange,
  isTimeString,
  joinTime,
  minuteOptions,
  MERIDIEM_SHORT,
  roundToStep,
  splitTime,
  type Meridiem,
  type TimeParts,
} from "@/lib/timeOptions";
import { cx, field } from "./ui";

/**
 * اختيارُ وقتٍ بهوية الموقع — بديلُ `input[type=time]` في الموقع كلِّه.
 *
 * وعلّتُه علّةُ `input[type=date]` نفسُها: يُرسَم بواجهة نظام التشغيل لا
 * بواجهة الموقع. في كروم أسهمٌ صغيرةٌ وأيقونةُ ساعةٍ من ويندوز، وفي فايرفوكس
 * شكلٌ ثالث، وفي سفاري الجوّال عجلةٌ تُغطّي الشاشة. وصيغةُ ١٢/٢٤ ساعةً تتبع
 * **لغةَ النظام** لا لغةَ الموقع: فموظّفٌ يُدخل «٥:٠٠ م» وآخرُ على الجهاز نفسِه
 * يرى «17:00» في الحقل الواحد. ولا يقبل تنسيقاً ولا حلقةَ تركيزٍ من العدّة.
 *
 * فهذه ثلاثةُ أعمدة: الساعةُ (باثنتي عشرة، مرتَّبةً كوجه الساعة)، والدقيقةُ
 * (بخطوةٍ تُطلَب)، و«ص/م». والمختارُ ظاهرٌ في كلّ عمودٍ ومُجلَبٌ إلى العين عند
 * الفتح، فلا تمريرَ بحثاً عن القيمة الحاضرة.
 *
 * **والعقدُ عقدُ الحقل الأصليّ**: القيمةُ نصُّ «HH:MM» بأربعٍ وعشرين ساعة،
 * و`onChange` يُعطي نصّاً — فاستبدالُه لا يُغيّر منطقَ أيّ شاشة ولا ما يُحفظ
 * في القاعدة.
 */

const PANEL_WIDTH = 248;
const PANEL_HEIGHT = 268;
const GAP = 6;

type Position = { left: number; top?: number; bottom?: number };

/** الوقتُ الذي تُفتح عليه اللوحةُ حين لا قيمة: أوّلُ الدوام، لا منتصفُ الليل. */
const DEFAULT_PARTS: TimeParts = { hour12: 8, minute: 0, meridiem: "AM" };

export default function TimeField({
  value,
  onChange,
  id,
  min,
  max,
  /** دقائقُ الخطوة في عمود الدقيقة. */
  step = 5,
  placeholder = "اختر الوقت",
  disabled = false,
  required = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelId = useId();

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

  // الأعمدةُ تُمرَّر، فالمختارُ يُجلب إلى مجال الرؤية عند الفتح — وإلّا فُتحت
  // اللوحةُ على أوّل العمود والقيمةُ الحاضرةُ أسفلَ منه بعشرة صفوف.
  useEffect(() => {
    if (!isOpen) return;
    for (const key of ["hour", "minute", "meridiem"]) {
      activeRefs.current[key]?.scrollIntoView({ block: "center" });
    }
  }, [isOpen]);

  const parts = splitTime(isTimeString(value) ? roundToStep(value, step) : "") ?? DEFAULT_PARTS;
  const hasValue = isTimeString(value);

  /** تغييرُ جزءٍ واحدٍ يُبني الوقتَ من بقيّة الأجزاء كما هي. */
  const setPart = (patch: Partial<TimeParts>) => {
    const next = joinTime({ ...parts, ...patch });
    onChange(next);
  };

  const minutes = minuteOptions(step);

  const column = (
    key: string,
    label: string,
    options: { value: number | Meridiem; text: string; selected: boolean; blocked: boolean }[],
    onPick: (value: never) => void
  ) => (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="mb-1 text-center text-caption font-semibold text-slate-400 dark:text-slate-500">{label}</span>
      <div className="h-[200px] overflow-y-auto rounded-md border border-slate-100 py-1 dark:border-slate-800">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            disabled={option.blocked}
            aria-pressed={option.selected}
            ref={(el) => {
              if (option.selected) activeRefs.current[key] = el;
            }}
            onClick={() => onPick(option.value as never)}
            className={cx(
              "block w-full px-2 py-1.5 text-center text-body tabular-nums outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
              option.selected
                ? "bg-primary font-semibold text-white"
                : option.blocked
                  ? "cursor-not-allowed text-slate-300 dark:text-slate-700"
                  : "text-slate-700 hover:bg-primary/[0.08] dark:text-slate-200 dark:hover:bg-teal-400/10"
            )}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );

  const panel =
    isOpen && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="اختيار الوقت"
            dir="rtl"
            style={{ position: "fixed", left: position.left, top: position.top, bottom: position.bottom, width: PANEL_WIDTH }}
            className="z-[130] rounded-lg border border-slate-200/80 bg-white p-3 shadow-[0_12px_32px_-12px_rgb(15_23_42/0.28)] animate-[zad-pop-in_120ms_ease-out] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start gap-2">
              {column(
                "hour",
                "الساعة",
                HOUR_OPTIONS.map((hour) => ({
                  value: hour,
                  text: String(hour),
                  selected: hasValue && parts.hour12 === hour,
                  // ساعةٌ كلُّ دقائقها خارج المدى تُقفل — لا ساعةٌ يُقبل بعضُها.
                  blocked: minutes.every((minute) =>
                    isTimeOutOfRange(joinTime({ ...parts, hour12: hour, minute }), min, max)
                  ),
                })),
                (hour: number) => setPart({ hour12: hour })
              )}

              {column(
                "minute",
                "الدقيقة",
                minutes.map((minute) => ({
                  value: minute,
                  text: String(minute).padStart(2, "0"),
                  selected: hasValue && parts.minute === minute,
                  blocked: isTimeOutOfRange(joinTime({ ...parts, minute }), min, max),
                })),
                (minute: number) => setPart({ minute })
              )}

              {column(
                "meridiem",
                "—",
                (["AM", "PM"] as Meridiem[]).map((meridiem) => ({
                  value: meridiem,
                  text: MERIDIEM_SHORT[meridiem],
                  selected: hasValue && parts.meridiem === meridiem,
                  blocked: minutes.every((minute) =>
                    isTimeOutOfRange(joinTime({ ...parts, meridiem, minute }), min, max)
                  ),
                })),
                (meridiem: Meridiem) => setPart({ meridiem })
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <span className="text-meta font-semibold text-slate-600 tabular-nums dark:text-slate-300">
                {hasValue ? formatTime12(value) : "—"}
              </span>

              <div className="flex items-center gap-1">
                {!required && hasValue && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className="rounded-md px-2 py-1 text-meta font-medium text-slate-500 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    مسح
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    // لوحةٌ تُغلق بزرٍّ صريح: الاختيارُ ثلاثُ نقراتٍ في ثلاثة
                    // أعمدة، فإغلاقٌ بعد أوّلِ نقرةٍ يمنع إتمامَ الاختيار.
                    if (!hasValue) onChange(joinTime(parts));
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="rounded-md px-2 py-1 text-meta font-medium text-primary outline-none transition-colors hover:bg-primary/[0.08] focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300 dark:hover:bg-teal-400/10"
                >
                  تمّ
                </button>
              </div>
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
        onClick={() => (isOpen ? setIsOpen(false) : setIsOpen(true))}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cx(field, "flex items-center gap-2 text-right", isOpen && "border-primary/60 ring-[3px] ring-primary/15")}
      >
        <Clock className="size-4 shrink-0 text-slate-400" />
        <span className={cx("flex-1 truncate tabular-nums", !hasValue && "text-slate-400 dark:text-slate-600")}>
          {hasValue ? formatTime12(value) : placeholder}
        </span>
      </button>

      {/* كما في `DateField`: `required` حكمٌ يُنفّذه المتصفّح على عناصر
          النماذج، والزرُّ ليس منها — فحقلٌ شفّافٌ بحجم نقطةٍ يحمل الحكم. */}
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
