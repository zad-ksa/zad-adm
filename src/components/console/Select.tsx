"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  /** عنوانُ مجموعةٍ لا خيار: يُعرض ولا يُختار ولا تقف عليه الأسهم. */
  disabled?: boolean;
};

/**
 * صيغتان لشكلٍ واحد: console لشاشات الإدارة الكثيفة (زوايا ضيّقة)، وsoft للشاشات
 * المريحة كالبريد والبوابة. المنطق واحد — فلا يتكرر مكوّنٌ لأن مظهره اختلف.
 */
export type SelectVariant = "console" | "soft";

/**
 * قائمةٌ منسدلة بهوية الموقع.
 *
 * `select` الأصلية تُرسَم بواجهة النظام لا بواجهة الموقع: خطٌّ آخر، وحوافٌّ
 * حادّة، ولونٌ أزرق للاختيار في ويندوز، ولا تقبل تنسيق خياراتها. وهنا زرٌّ
 * وقائمةٌ عاديّان، فيتبعان ألوان الهوية وخطّها وزواياها في الوضعين الفاتح
 * والداكن.
 *
 * **واللوحة تُرسم في جسم الصفحة لا داخل الزرّ.** الحاويات التي تعيش فيها هذه
 * القوائم مقصوصةٌ بـ`overflow-hidden` أو قابلةٌ للتمرير، فالعنصر المُطلَق داخلها
 * يُقصّ عند حافّتها ولا يُرى إلا نصفه. ومكانها يُحسب من موضع الزرّ على الشاشة،
 * فإن ضاق ما تحته انقلبت فوقه، وإن ضاق الاثنان قُصّ ارتفاعها لا حوافّها.
 *
 * وتُغلق بالمفتاح Escape وبالنقر خارجها، وتُبحَث حين تطول — فقائمة عشرين اسماً
 * بلا بحثٍ أبطأ من كتابة حرفين.
 */

/** أدنى ارتفاعٍ يستحق الفتح إلى الأسفل؛ دونه يُنظر إلى ما فوق الزرّ. */
const MIN_PANEL_SPACE = 180;
const MAX_PANEL_HEIGHT = 280;
const GAP = 6;

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export default function Select({
  options,
  value,
  onSelect,
  placeholder,
  emptyLabel = "لا خيارات",
  disabled = false,
  searchThreshold = 8,
  variant = "console",
  className = "",
}: {
  options: SelectOption[];
  /** القيمة المختارة. بلا هذه تكون القائمة مُنتقي «إضافة» يعرض دعوةً ثابتة. */
  value?: string;
  onSelect: (value: string) => void;
  /** ما يُعرض حين لا قيمة — لا يحلّ محلّ القيمة حين توجد. */
  placeholder: string;
  /** ما يُقال حين لا خيار — سببٌ لا فراغ. */
  emptyLabel?: string;
  disabled?: boolean;
  /** يظهر حقل البحث عند تجاوز هذا العدد. */
  searchThreshold?: number;
  variant?: SelectVariant;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  // الخيار «النشط» — ما يقع عليه Enter. يتحرّك بالأسهم، ويُميَّز بصرياً كما
  // يُميَّز الخيار تحت المؤشّر، فلا يحتاج مستعمل لوحة المفاتيح أن يخمّن أين هو.
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 208), 288);
    // محاذاةٌ يمنى: الواجهة كلها RTL، فحافّة القائمة اليمنى على حافّة الزرّ اليمنى.
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);

    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;

    // تنقلب فوق الزرّ حين يضيق ما تحته ويتّسع ما فوقه — وهو حال آخر صفٍّ في الصفحة.
    if (below < MIN_PANEL_SPACE && above > below) {
      setPosition({
        left,
        width,
        bottom: window.innerHeight - rect.top + GAP,
        maxHeight: Math.min(MAX_PANEL_HEIGHT, above),
      });
      return;
    }

    setPosition({ left, width, top: rect.bottom + GAP, maxHeight: Math.min(MAX_PANEL_HEIGHT, below) });
  }, []);

  // القياس قبل الرسم: لوحةٌ تظهر في مكانٍ ثم تقفز إلى مكانها الصحيح أسوأ من انتظارها.
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
      if (e.key === "Escape") setIsOpen(false);
    };
    // التمرير يحرّك الزرّ لا اللوحة، فتُعاد المحاذاة معه. و`capture` ليُسمع تمرير
    // الحاويات الداخلية كما يُسمع تمرير الصفحة.
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

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  // القائمة قد تطول وتُمرَّر، فالخيار النشط يُجلب إلى مجال الرؤية مع كل حركة.
  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  // الفرق بين الصيغتين زوايا لا منطق.
  const radius = variant === "console" ? { trigger: "rounded-md", panel: "rounded-lg" } : { trigger: "rounded-xl", panel: "rounded-xl" };

  const selected = value != null ? options.find((o) => o.value === value) : undefined;
  const isEmpty = options.length === 0;
  const showSearch = options.length > searchThreshold;
  const q = query.trim();
  const shown = q ? options.filter((o) => o.label.includes(q)) : options;
  // الفواصل لا تُعدّ خيارات: التنقّل يقفز فوقها.
  const selectableAt = (i: number) => !shown[i]?.disabled;
  const clampedActive = Math.min(activeIndex, Math.max(0, shown.length - 1));

  /**
   * مفاتيح القائمة، معالَجةٌ حيث يقع التركيز — الزرّ أو حقل البحث — لا على
   * مستوى المستند: معالجٌ عامٌّ كان سيخطف الأسهم من كل قائمةٍ أخرى مفتوحة.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      // من الزرّ المغلق: السهم لأسفل أو Enter يفتح القائمة.
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setQuery("");
        setActiveIndex(0);
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (shown.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      // يلتفّ من آخر القائمة إلى أولها: أقصر طريقٍ إلى الخيار الأخير سهمٌ
      // واحدٌ لأعلى، لا عشرون لأسفل.
      setActiveIndex((i) => {
        let next = Math.min(i, shown.length - 1);
        for (let hop = 0; hop < shown.length; hop++) {
          next = (next + step + shown.length) % shown.length;
          if (selectableAt(next)) break;
        }
        return next;
      });
      return;
    }

    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActiveIndex(e.key === "Home" ? 0 : Math.max(0, shown.length - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const option = shown[clampedActive];
      if (option && !option.disabled) {
        onSelect(option.value);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Tab") {
      setIsOpen(false);
      if (e.key === "Escape") triggerRef.current?.focus();
    }
  };

  const panel =
    isOpen && !isEmpty && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-activedescendant={shown[clampedActive] ? `${listId}-${clampedActive}` : undefined}
            dir="rtl"
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
            className={`z-[120] flex flex-col ${radius.panel} border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_12px_32px_-12px_rgb(15_23_42_/_0.28)] overflow-hidden animate-[zad-pop-in_120ms_ease-out]`}
          >
            {showSearch && (
              <div className="flex items-center gap-2 px-3 h-9 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    // تصفيةٌ جديدة تُعيد النشاط إلى أول نتيجة، وإلا بقي مؤشّرٌ
                    // على خيارٍ لم يعد معروضاً.
                    setActiveIndex(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="بحث…"
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-1">
              {shown.length === 0 ? (
                <p className="px-3 py-2 text-[13px] text-slate-400 dark:text-slate-500">لا نتيجة</p>
              ) : (
                shown.map((option, index) =>
                  option.disabled ? (
                    <p
                      key={option.value}
                      className="px-3 pb-1 pt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                    >
                      {option.label}
                    </p>
                  ) : (
                  <button
                    key={option.value}
                    id={`${listId}-${index}`}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={index === clampedActive}
                    tabIndex={-1}
                    // المؤشّر والأسهم يحرّكان الشيء نفسه: «النشط» واحدٌ مهما كان
                    // مصدر الحركة، فلا يظهر تمييزان في وقتٍ واحد.
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onSelect(option.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-right text-[13px] transition-colors ${
                      index === clampedActive
                        ? "bg-primary/[0.07] dark:bg-primary/[0.15] text-primary dark:text-teal-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 text-primary dark:text-teal-300 ${
                        index === clampedActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.hint && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        {option.hint}
                      </span>
                    )}
                  </button>
                  )
                )
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${className}`} dir="rtl">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || isEmpty}
        onClick={() => {
          // البحث يُصفَّر عند كل فتح، لا داخل تأثيرٍ يعمل مع الرسم.
          setQuery("");
          // يُفتح على الخيار المختار لا على أوّل القائمة: من أراد تغيير قيمةٍ
          // بدأ منها، لا من رأس قائمةٍ طويلة.
          setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
          setIsOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onKeyDown={onKeyDown}
        className={`h-9 px-3 inline-flex items-center gap-2 ${radius.trigger} border bg-white dark:bg-slate-900 text-[13px] font-medium transition-colors ${
          isEmpty || disabled
            ? "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            : isOpen
              ? "border-primary/50 text-primary dark:text-teal-300 shadow-[0_0_0_3px_rgb(15_118_110_/_0.12)]"
              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:text-primary dark:hover:text-teal-300"
        }`}
      >
        <span className={selected ? "" : "text-slate-500 dark:text-slate-400"}>
          {isEmpty ? emptyLabel : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {panel}
    </div>
  );
}
