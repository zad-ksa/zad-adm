"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cx, field } from "./ui";

/**
 * حقلُ وسوم: تُكتب واحداً واحداً فتصير شارات.
 *
 * **ولمَ حقلٌ في العدّة لا نصٌّ بفواصل**: النصُّ يُكتب «تعليم، صحة ،تدريب»
 * فيُقطَّع تقطيعاً يختلف بين شاشةٍ وأخرى، ولا يُرى ما حُفظ إلّا بعد الحفظ.
 * وهنا يُرى الوسمُ شارةً أوّلَ ما يُكتب، ويُحذف بنقرة.
 *
 * **والإضافةُ بثلاثة**: `Enter`، والفاصلة (عربيّةً أو لاتينيّة)، ومغادرةُ
 * الحقل — فمن كتب وسماً ثمّ ضغط «حفظ» لا يضيع ما كتب. و`Backspace` في حقلٍ
 * فارغٍ يحذف آخرَ وسم، كما في كلِّ حقلِ وسومٍ يعرفه الناس.
 *
 * **والمكرَّرُ لا يُضاف**: المقارنةُ بلا مسافاتٍ ولا حالةِ أحرف، فـ«تعليم»
 * و«التعليم » وسمان لا واحد، أمّا «تعليم» و«تعليم» فواحد.
 */
export default function TagsField({
  values,
  onChange,
  placeholder = "اكتب وسما ثم اضغط Enter",
  max = 12,
  disabled = false,
  label,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** أقصى عددٍ من الوسوم — وعنده يُقفل الحقل. */
  max?: number;
  disabled?: boolean;
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = values.length >= max;

  const key = (v: string) => v.replace(/\s+/g, "").toLowerCase();

  const add = (raw: string) => {
    const value = raw.replace(/\s+/g, " ").trim();
    if (!value || full) return;
    if (values.some((v) => key(v) === key(value))) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "،") {
      // ومنعُ الافتراضي: `Enter` في نموذجٍ يُرسله، والفاصلةُ تُكتب حرفاً.
      event.preventDefault();
      add(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div
      className={cx(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5",
        "transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/15",
        "dark:border-slate-800 dark:bg-slate-950",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-caption text-primary dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-300"
        >
          {value}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`حذف الوسم ${value}`}
              className="rounded-full outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        disabled={disabled || full}
        aria-label={label ?? "وسوم"}
        placeholder={full ? `بلغت الحد: ${max} وسوم` : values.length === 0 ? placeholder : ""}
        className={cx(
          field,
          "h-6 min-w-32 flex-1 border-0 bg-transparent px-1 shadow-none",
          "focus:border-0 focus:ring-0 hover:border-0 dark:bg-transparent"
        )}
      />
    </div>
  );
}
