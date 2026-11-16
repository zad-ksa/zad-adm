"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Select from "./Select";
import { cx, field } from "./ui";
import { notify } from "./toastBus";

/**
 * خليّةُ جدولٍ تُحرَّر في مكانها.
 *
 * **ولمَ لا نافذة**: الجداول التي تُملأ عموداً عموداً — خطوات المبادرة مثلاً —
 * تعني في النافذة: فتحٌ، ثمّ بحثٌ عن الحقل بين عشرة، ثمّ حفظٌ، ثمّ إغلاق، لتغيير
 * رقمٍ واحد. والتحريرُ في موضعه: نقرةٌ، فكتابةٌ، فـEnter.
 *
 * **والحفظُ حقلاً حقلاً** لا صفّاً كاملاً: من يحرّر خليّةً لا يُعيد كتابة بقيّة
 * الصفّ، فلا يمحو ما غيّره غيرُه فيه بين فتحِه وحفظِه.
 *
 * ولا تُحفظ إلا إن تغيّرت القيمة: Enter على خليّةٍ لم تُمسّ لا يُرسل شيئاً.
 * وEscape يُلغي، والخطأُ يُعيد المعروضَ إلى ما كان ويُقال سببُه.
 *
 * والقائمةُ (`select`) تُعرض ظاهرةً دائماً لا بعد نقرة: قائمةٌ لا تُفتح إلا
 * بنقرتين تُقرأ نصّاً لا حقلاً.
 */
export default function EditableCell({
  value,
  children,
  onSave,
  label,
  kind = "text",
  options = [],
  align = "center",
  placeholder = "—",
  disabled = false,
}: {
  /** القيمة كما تُحرَّر — خامٌ بلا تنسيق. */
  value: string;
  /** القيمة كما تُعرض — قد تكون وسماً أو رقماً منسَّقاً. */
  children: ReactNode;
  onSave: (next: string) => Promise<{ error?: string }>;
  /** لقارئ الشاشة: «نسبة الإنجاز للخطوة ٣». */
  label: string;
  kind?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  align?: "start" | "center";
  placeholder?: string;
  /** بلا صلاحية: تُعرض القيمةُ كما هي بلا حقل. */
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, start] = useTransition();
  // Escape يُغلق قبل أن يُحفظ: العلامةُ تُقرأ في `onBlur` الذي يليه.
  const cancelled = useRef(false);

  const save = (next: string) => {
    setEditing(false);
    if (next.trim() === value.trim()) return;
    setDraft(next);
    start(async () => {
      const result = await onSave(next);
      if (result?.error) {
        notify("error", result.error);
        setDraft(value);
      }
    });
  };

  if (disabled) return <>{children}</>;

  if (kind === "select") {
    return (
      <Select
        variant="soft"
        value={value}
        onSelect={save}
        placeholder={placeholder}
        options={options}
        className={cx(
          "w-full",
          "[&>button]:w-full [&>button]:justify-between [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-1.5 [&>button]:shadow-none",
          "hover:[&>button]:border-slate-200 hover:[&>button]:bg-white dark:hover:[&>button]:border-slate-700 dark:hover:[&>button]:bg-slate-900"
        )}
      />
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={value}
        aria-label={label}
        inputMode={kind === "number" ? "decimal" : undefined}
        dir={kind === "number" ? "ltr" : undefined}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          if (cancelled.current) {
            cancelled.current = false;
            setEditing(false);
            return;
          }
          save(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
        className={cx(
          field,
          "h-7 px-1.5 text-caption",
          kind === "number" ? "text-center tabular-nums" : align === "start" ? "text-start" : "text-center"
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`تعديل ${label}`}
      title="اضغط للتعديل"
      className={cx(
        "block w-full rounded-md px-1 py-0.5 outline-none transition-colors",
        "hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-teal-400/10",
        align === "start" ? "text-start" : "text-center",
        pending && "opacity-50"
      )}
    >
      {pending ? draft || placeholder : children}
    </button>
  );
}
