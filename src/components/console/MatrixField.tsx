"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eraser } from "lucide-react";
import { cx, MONO } from "./ui";

/**
 * مصفوفةُ تقييم: صفٌّ لكل ما يُقيَّم، وعمودٌ لكل معيار، وفي كل خليّةٍ درجةٌ
 * من ١ إلى `max`.
 *
 * والخليّةُ زرٌّ يُفتح عند النقر فيُختار الرقم — ولا تُرسَم خمسةُ أزرارٍ في كل
 * خليّة: جدولٌ بتسعة صفوفٍ وخمسةِ أعمدةٍ يصير ٢٢٥ هدفَ نقرٍ في شاشةٍ واحدة،
 * لا يُقرأ ولا يُنقر على الهاتف.
 *
 * والقائمةُ تُرسَم بـ`createPortal` ثابتةَ الموضع: الجدولُ يُمرَّر أفقيّاً
 * (`overflow-x-auto`) فيقصّ كلَّ ما يطلع من خليّة — وهي نفسُها علّةُ
 * `Select` و`DateField`.
 *
 * والصفُّ الأوّلُ لاصقٌ (`sticky`) لأنّ من مرّر إلى العمود الخامس لا يرى اسمَ
 * الخدمة التي يُقيّمها.
 *
 * ولا يلزم الفأرة: الخليّةُ تُدرَك بـTab، وتُفتح بـEnter، **وتقبل الرقمَ
 * مكتوباً** — فمن يُقيّم ٤٥ خليّةً يكتب ولا ينقر، و`Delete` تمحو.
 */
export type MatrixHeading = { id: string; text: string };

type Anchor = { key: string; rowId: string; columnId: string; top: number; left: number; width: number };

export function MatrixField({
  rows,
  columns,
  max = 5,
  labels,
  value,
  onChange,
  cellKey,
  label,
  hint,
  disabled = false,
}: {
  rows: MatrixHeading[];
  columns: MatrixHeading[];
  max?: number;
  /** تسميةُ كل درجة: `labels["5"] = "ممتاز"`. */
  labels?: Record<string, string>;
  /** الدرجاتُ الحاضرة، بمفاتيح `cellKey`. */
  value: Record<string, string | undefined>;
  onChange: (key: string, score: string | null) => void;
  /** مفتاحُ الخليّة — من `lib/surveyQuestions.ts` كي يتطابق مع ما يُحفظ. */
  cellKey: (rowId: string, columnId: string) => string;
  /** اسمُ المصفوفة لقارئ الشاشة. */
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // تُغلق بالنقر خارجها، وبالتمرير، وبتغيُّر المقاس، وبـEsc — فموضعُها محسوبٌ
  // لحظةَ الفتح، وأيُّ حركةٍ بعده تجعله كذباً.
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor]);

  // التركيزُ ينتقل إلى القائمة عند فتحها، فتعمل الأسهمُ وتُغلق Esc فعلاً.
  useLayoutEffect(() => {
    if (!anchor) return;
    popoverRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [anchor]);

  const open = (event: React.MouseEvent<HTMLButtonElement>, rowId: string, columnId: string) => {
    if (disabled) return;
    const key = cellKey(rowId, columnId);
    if (anchor?.key === key) {
      setAnchor(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const height = 52 + max * 34;
    const below = window.innerHeight - rect.bottom;
    setAnchor({
      key,
      rowId,
      columnId,
      // تُقلب فوقَ الخليّة إذا ضاق ما تحتها — وإلّا خرجت عن الشاشة.
      top: below < height && rect.top > height ? rect.top - height - 6 : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 176)),
      width: rect.width,
    });
  };

  const pick = (key: string, score: string | null) => {
    onChange(key, score);
    setAnchor(null);
  };

  const onCellKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, key: string) => {
    if (disabled) return;
    if (/^[0-9]$/.test(event.key)) {
      const score = Number(event.key);
      if (score >= 1 && score <= max) {
        event.preventDefault();
        onChange(key, String(score));
        setAnchor(null);
      }
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onChange(key, null);
      setAnchor(null);
    }
  };

  const scores = Array.from({ length: max }, (_, index) => max - index); // الأعلى أوّلاً
  const scoreText = (score: number) => (labels?.[String(score)] ? `${score} — ${labels[String(score)]}` : String(score));

  return (
    <div>
      {hint && <p className="mb-2 text-meta text-slate-500 dark:text-slate-400">{hint}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse" aria-label={label}>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              <th
                scope="col"
                className="sticky start-0 z-10 min-w-[180px] border-e border-slate-200 bg-slate-50 px-3 py-2.5 text-start text-meta font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                {label}
              </th>
              {columns.map((column) => (
                <th
                  scope="col"
                  key={column.id}
                  className="min-w-[92px] border-e border-slate-200 px-2 py-2.5 text-center text-meta font-medium leading-snug text-slate-600 last:border-e-0 dark:border-slate-700 dark:text-slate-300"
                >
                  {column.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className={cx("border-t border-slate-200 dark:border-slate-700", rowIndex % 2 === 1 && "bg-slate-50/50 dark:bg-slate-800/20")}>
                <th
                  scope="row"
                  className={cx(
                    "sticky start-0 z-10 min-w-[180px] border-e border-slate-200 px-3 py-2 text-start text-body font-medium leading-snug text-slate-700 dark:border-slate-700 dark:text-slate-200",
                    rowIndex % 2 ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-900"
                  )}
                >
                  {row.text}
                </th>
                {columns.map((column) => {
                  const key = cellKey(row.id, column.id);
                  const score = value[key];
                  const isOpen = anchor?.key === key;
                  return (
                    <td key={column.id} className="border-e border-slate-200 p-1 text-center last:border-e-0 dark:border-slate-700">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={(event) => open(event, row.id, column.id)}
                        onMouseDown={(event) => event.stopPropagation()}
                        onKeyDown={(event) => onCellKeyDown(event, key)}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        aria-label={`${row.text} — ${column.text}${score ? `: ${scoreText(Number(score))}` : ": لم يُقيَّم"}`}
                        title={score ? scoreText(Number(score)) : "انقر لاختيار درجة"}
                        className={cx(
                          "mx-auto grid h-9 w-full max-w-[72px] place-items-center rounded-md border text-body font-semibold transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                          "disabled:pointer-events-none disabled:opacity-50",
                          score
                            ? "border-primary/30 bg-primary/10 text-primary dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300"
                            : "border-slate-200 bg-white text-slate-300 hover:border-primary/40 hover:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600",
                          isOpen && "ring-2 ring-primary/40"
                        )}
                      >
                        <span className={score ? MONO : undefined}>{score || "—"}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="menu"
            aria-label="اختيار الدرجة"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ top: anchor.top, left: anchor.left, minWidth: Math.max(168, anchor.width) }}
            className="fixed z-50 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-[0_8px_30px_rgb(15_23_42/0.12)] motion-safe:animate-[zad-pop-in_120ms_ease-out] dark:border-slate-700 dark:bg-slate-900"
          >
            {scores.map((score) => {
              const picked = value[anchor.key] === String(score);
              return (
                <button
                  key={score}
                  type="button"
                  role="menuitemradio"
                  aria-checked={picked}
                  onClick={() => pick(anchor.key, String(score))}
                  className={cx(
                    "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-start text-body transition-colors outline-none",
                    picked
                      ? "bg-primary/10 font-semibold text-primary dark:bg-teal-500/10 dark:text-teal-300"
                      : "text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >
                  <span className={cx(MONO, "w-4 text-center")}>{score}</span>
                  {labels?.[String(score)] && <span className="truncate">{labels[String(score)]}</span>}
                </button>
              );
            })}
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(anchor.key, null)}
              className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-start text-body text-slate-500 transition-colors outline-none hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Eraser className="size-3.5" />
              مسح الدرجة
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default MatrixField;
