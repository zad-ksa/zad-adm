"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type SelectOption = { value: string; label: string; hint?: string };

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
  onSelect,
  placeholder,
  emptyLabel = "لا خيارات",
  disabled = false,
  searchThreshold = 8,
  variant = "console",
  className = "",
}: {
  options: SelectOption[];
  onSelect: (value: string) => void;
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

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // الفرق بين الصيغتين زوايا لا منطق.
  const radius = variant === "console" ? { trigger: "rounded-md", panel: "rounded-lg" } : { trigger: "rounded-xl", panel: "rounded-xl" };

  const isEmpty = options.length === 0;
  const showSearch = options.length > searchThreshold;
  const q = query.trim();
  const shown = q ? options.filter((o) => o.label.includes(q)) : options;

  const panel =
    isOpen && !isEmpty && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="listbox"
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث…"
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-1">
              {shown.length === 0 ? (
                <p className="px-3 py-2 text-[13px] text-slate-400 dark:text-slate-500">لا نتيجة</p>
              ) : (
                shown.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onSelect(option.value);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-right text-[13px] text-slate-700 dark:text-slate-200 hover:bg-primary/[0.07] dark:hover:bg-primary/[0.15] hover:text-primary dark:hover:text-teal-300 transition-colors group"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 text-primary dark:text-teal-300" />
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.hint && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        {option.hint}
                      </span>
                    )}
                  </button>
                ))
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
          setIsOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`h-9 px-3 inline-flex items-center gap-2 ${radius.trigger} border bg-white dark:bg-slate-900 text-[13px] font-medium transition-colors ${
          isEmpty || disabled
            ? "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            : isOpen
              ? "border-primary/50 text-primary dark:text-teal-300 shadow-[0_0_0_3px_rgb(15_118_110_/_0.12)]"
              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:text-primary dark:hover:text-teal-300"
        }`}
      >
        {isEmpty ? emptyLabel : placeholder}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {panel}
    </div>
  );
}
