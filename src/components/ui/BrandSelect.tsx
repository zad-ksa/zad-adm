"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type BrandSelectOption = { value: string; label: string; hint?: string };

/**
 * قائمةٌ منسدلة بهوية الموقع.
 *
 * `select` الأصلية تُرسَم بواجهة النظام لا بواجهة الموقع: خطٌّ آخر، وحوافٌّ
 * حادّة، ولونٌ أزرق للاختيار في ويندوز، ولا تقبل تنسيق خياراتها. وهنا زرٌّ
 * وقائمةٌ عاديّان، فيتبعان ألوان الهوية وخطّها وزواياها في الوضعين الفاتح
 * والداكن.
 *
 * وتُغلق بالمفتاح Escape وبالنقر خارجها، وتُبحَث حين تطول — فقائمة عشرين اسماً
 * بلا بحثٍ أبطأ من كتابة حرفين.
 */
export default function BrandSelect({
  options,
  onSelect,
  placeholder,
  emptyLabel = "لا خيارات",
  disabled = false,
  searchThreshold = 8,
  align = "start",
  className = "",
}: {
  options: BrandSelectOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  /** ما يُقال حين لا خيار — سببٌ لا فراغ. */
  emptyLabel?: string;
  disabled?: boolean;
  /** يظهر حقل البحث عند تجاوز هذا العدد. */
  searchThreshold?: number;
  align?: "start" | "end";
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const isEmpty = options.length === 0;
  const showSearch = options.length > searchThreshold;
  const q = query.trim();
  const shown = q ? options.filter((o) => o.label.includes(q)) : options;

  return (
    <div ref={rootRef} className={`relative ${className}`} dir="rtl">
      <button
        type="button"
        disabled={disabled || isEmpty}
        onClick={() => {
          // البحث يُصفَّر عند كل فتح، لا داخل تأثيرٍ يعمل مع الرسم.
          setQuery("");
          setIsOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`h-9 px-3 inline-flex items-center gap-2 rounded-xl border bg-white dark:bg-slate-900 text-[13px] font-medium transition-colors ${
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

      {isOpen && !isEmpty && (
        <div
          role="listbox"
          className={`absolute z-40 mt-1.5 min-w-[13rem] max-w-[18rem] rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_12px_32px_-12px_rgb(15_23_42_/_0.28)] overflow-hidden animate-[zad-pop-in_120ms_ease-out] ${
            align === "end" ? "left-0" : "right-0"
          }`}
        >
          {showSearch && (
            <div className="flex items-center gap-2 px-3 h-9 border-b border-slate-100 dark:border-slate-800">
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

          <div className="max-h-56 overflow-y-auto py-1">
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
        </div>
      )}
    </div>
  );
}
