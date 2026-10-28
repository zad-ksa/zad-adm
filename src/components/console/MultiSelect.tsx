"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import type { SelectOption, SelectVariant } from "./Select";
import { OptionRow, SelectAll } from "./ui";

/**
 * قائمةٌ منسدلةٌ باختيارٍ متعدِّد — «جمعيةٌ أو أكثرُ أو الكلّ».
 *
 * و`Select` مُفردٌ لا يقبل هذا: اختيارُ خيارٍ فيها يُغلقها ويُبدِل ما قبله.
 * فالمنطقُ هنا منطقُها نفسه — لوحةٌ في جسم الصفحة تنقلب فوق الزرّ إن ضاق ما
 * تحته، وتُغلق بـEscape وبالنقر خارجها، وتُبحَث حين تطول — والفرقُ أن الخيار
 * يُقلَب ولا تُغلق اللوحة، فاختيارُ ثلاثِ جمعياتٍ ثلاثُ نقراتٍ لا ثلاثُ فتحات.
 *
 * وصفوفُها `OptionRow` ورأسُها `SelectAll` من العُدّة، فشكلُ الاختيار المتعدِّد
 * هنا هو شكلُه في لوحة الصلاحيات.
 *
 * **ولا شيءَ مختارٌ يعني «الكلّ»** في المُرشِّحات: مُرشِّحٌ فارغٌ لا يحجب،
 * ولذلك يُعرض `placeholder` حين تفرغ القائمة لا «٠ مختارة».
 */
const MIN_PANEL_SPACE = 180;
const MAX_PANEL_HEIGHT = 300;
const GAP = 6;

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export default function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  label,
  allLabel,
  emptyLabel = "لا خيارات",
  countNoun = "مختارة",
  searchThreshold = 8,
  variant = "console",
  disabled = false,
  className = "",
}: {
  options: SelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  /** ما يُعرض حين لا شيء مختار — وهو «الكلّ» في المُرشِّحات. */
  placeholder: string;
  /** اسمُ المُرشِّح لقارئ الشاشة. */
  label: string;
  /** ما يُعرض حين تُختار كلُّ الخيارات — افتراضُه `placeholder`. */
  allLabel?: string;
  emptyLabel?: string;
  /** معدودُ الرقم في الزرّ: «٣ مختارة»، «٣ جمعيات». */
  countNoun?: string;
  searchThreshold?: number;
  variant?: SelectVariant;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 224), 320);
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);

    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;

    if (below < MIN_PANEL_SPACE && above > below) {
      setPosition({ left, width, bottom: window.innerHeight - rect.top + GAP, maxHeight: Math.min(MAX_PANEL_HEIGHT, above) });
      return;
    }
    setPosition({ left, width, top: rect.bottom + GAP, maxHeight: Math.min(MAX_PANEL_HEIGHT, below) });
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
      if (e.key === "Escape") setIsOpen(false);
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

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const radius = variant === "console" ? { trigger: "rounded-md", panel: "rounded-lg" } : { trigger: "rounded-xl", panel: "rounded-xl" };

  const isEmpty = options.length === 0;
  const showSearch = options.length > searchThreshold;
  const q = query.trim();
  const shown = q ? options.filter((o) => o.label.includes(q)) : options;
  const selectable = options.filter((o) => !o.disabled);
  const allOn = selectable.length > 0 && selectable.every((o) => values.includes(o.value));

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  const triggerText = isEmpty
    ? emptyLabel
    : values.length === 0
      ? placeholder
      : allOn
        ? (allLabel ?? placeholder)
        : values.length === 1
          ? (options.find((o) => o.value === values[0])?.label ?? `${values.length} ${countNoun}`)
          : `${values.length} ${countNoun}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
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
      setActiveIndex((i) => {
        let next = Math.min(i, shown.length - 1);
        for (let hop = 0; hop < shown.length; hop++) {
          next = (next + step + shown.length) % shown.length;
          if (!shown[next]?.disabled) break;
        }
        return next;
      });
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      // القلبُ لا يُغلق اللوحة: الاختيارُ المتعدِّد يُتمّ بعدّة نقرات.
      e.preventDefault();
      const option = shown[Math.min(activeIndex, shown.length - 1)];
      if (option && !option.disabled) toggle(option.value);
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
            <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
              <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">{label}</span>
              <SelectAll
                count={values.length}
                total={selectable.length}
                allOn={allOn}
                onClick={() => onChange(allOn ? [] : selectable.map((o) => o.value))}
              />
            </div>

            {showSearch && (
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
                <Search className="size-3.5 shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="بحث…"
                  className="flex-1 border-none bg-transparent text-body text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-1">
              {shown.length === 0 ? (
                <p className="px-2 py-2 text-body text-slate-400 dark:text-slate-500">لا نتيجة</p>
              ) : (
                shown.map((option) =>
                  option.disabled ? (
                    <p key={option.value} className="px-2 pb-1 pt-2 text-caption font-semibold text-slate-400 dark:text-slate-500">
                      {option.label}
                    </p>
                  ) : (
                    <OptionRow
                      key={option.value}
                      label={option.label}
                      note={option.hint}
                      checked={values.includes(option.value)}
                      onToggle={() => toggle(option.value)}
                    />
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
          setQuery("");
          setActiveIndex(0);
          setIsOpen((v) => !v);
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`h-9 px-3 inline-flex items-center gap-2 ${radius.trigger} border bg-white dark:bg-slate-900 text-body font-medium transition-colors ${
          isEmpty || disabled
            ? "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            : isOpen
              ? "border-primary/50 text-primary dark:text-teal-300 shadow-[0_0_0_3px_rgb(15_118_110_/_0.12)]"
              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:text-primary dark:hover:text-teal-300"
        }`}
      >
        <span className={values.length === 0 ? "text-slate-500 dark:text-slate-400" : ""}>{triggerText}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {panel}
    </div>
  );
}
